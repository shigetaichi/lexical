/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, NodeKey} from 'lexical';

import './CommentPlugin.css';

import AutoFocusPlugin from '@lexical/react/LexicalAutoFocusPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import PlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {$getSelection, $isRangeSelection, $isTextNode} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as React from 'react';
// $FlowFixMe: Flow doesn't see react-dom module
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

import CommentEditorTheme from '../themes/CommentEditorTheme';
import Button from '../ui/Button';
import ContentEditable from '../ui/ContentEditable.jsx';
import Placeholder from '../ui/Placeholder.jsx';

export type CommentContextType = {
  isActive: boolean,
  setActive: (val: boolean) => void,
};

function AddCommentBox({
  anchorKey,
  editor,
  onAddComment,
}: {
  anchorKey: NodeKey,
  editor: LexicalEditor,
  onAddComment: () => void,
}): React$Node {
  const boxRef = useRef(null);

  useLayoutEffect(() => {
    const boxElem = boxRef.current;
    const rootElement = editor.getRootElement();
    const anchorElement = editor.getElementByKey(anchorKey);

    if (boxElem !== null && rootElement !== null && anchorElement !== null) {
      const {right} = rootElement.getBoundingClientRect();
      const {top} = anchorElement.getBoundingClientRect();
      boxElem.style.left = `${right - 20}px`;
      boxElem.style.top = `${top - 30}px`;
    }
  }, [anchorKey, editor]);

  return (
    <div className="CommentPlugin_AddCommentBox" ref={boxRef}>
      <button
        className="CommentPlugin_AddCommentBox_button"
        onClick={onAddComment}>
        <i className="icon add-comment" />
      </button>
    </div>
  );
}

function PlainTextEditor() {
  const initialConfig = {
    namespace: 'CommentEditor',
    nodes: [],
    onError: (error) => {
      throw error;
    },
    theme: CommentEditorTheme,
  };
  const placeholder = <Placeholder>Type a comment...</Placeholder>;

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="CommentPlugin_CommentInputBox_EditorContainer">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable className="CommentPlugin_CommentInputBox_Editor" />
          }
          placeholder={placeholder}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
      </div>
    </LexicalComposer>
  );
}

function CommentInputBox({editor}: {editor: LexicalEditor}) {
  const boxRef = useRef(null);
  const selectionState = useMemo(
    () => ({
      container: document.createElement('div'),
      elements: [],
    }),
    [],
  );

  const updateLocation = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const range = createDOMRange(
          editor,
          anchor.getNode(),
          anchor.offset,
          focus.getNode(),
          focus.offset,
        );
        const boxElem = boxRef.current;
        if (range !== null && boxElem !== null) {
          const {left, width, bottom} = range.getBoundingClientRect();
          boxElem.style.left = `${left + width / 2 - 125}px`;
          boxElem.style.top = `${bottom + 20}px`;
          const selectionRects = createRectsFromDOMRange(editor, range);
          const selectionRectsLength = selectionRects.length;
          const {elements, container} = selectionState;
          const elementsLength = elements.length;

          for (let i = 0; i < selectionRectsLength; i++) {
            const selectionRect = selectionRects[i];
            let elem = elements[i];
            if (elem === undefined) {
              elem = document.createElement('span');
              elements[i] = elem;
              container.appendChild(elem);
            }
            const color = '255, 121, 45';
            const style = `position:absolute;top:${selectionRect.top}px;left:${selectionRect.left}px;height:${selectionRect.height}px;width:${selectionRect.width}px;background-color:rgba(${color}, 0.3);pointer-events:none;z-index:5;`;
            elem.style.cssText = style;
          }
          for (let i = elementsLength - 1; i >= selectionRectsLength; i--) {
            const elem = elements[i];
            container.removeChild(elem);
            elements.pop();
          }
        }
      }
    });
  }, [editor, selectionState]);

  useLayoutEffect(() => {
    updateLocation();
    const container = selectionState.container;
    const body = document.body;
    if (body !== null) {
      body.appendChild(container);
      return () => {
        body.removeChild(container);
      };
    }
  }, [selectionState.container, updateLocation]);

  useEffect(() => {
    window.addEventListener('resize', updateLocation);

    return () => {
      window.removeEventListener('resize', updateLocation);
    };
  }, [updateLocation]);

  return (
    <div className="CommentPlugin_CommentInputBox" ref={boxRef}>
      <PlainTextEditor />
      <div className="CommentPlugin_CommentInputBox_Buttons">
        <Button
          onClick={() => {}}
          className="CommentPlugin_CommentInputBox_Button">
          Cancel
        </Button>
        <Button
          onClick={() => {}}
          className="CommentPlugin_CommentInputBox_Button primary">
          Comment
        </Button>
      </div>
    </div>
  );
}

export function CommentPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const [activeAnchorKey, setActiveAnchorKey] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(false);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState, tags}) => {
        editorState.read(() => {
          const selection = $getSelection();

          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            const anchorNode = selection.anchor.getNode();

            if ($isTextNode(anchorNode)) {
              setActiveAnchorKey(anchorNode.getKey());
              return;
            }
          }
          setActiveAnchorKey(null);
        });
        if (!tags.has('collaboration')) {
          setShowCommentInput(false);
        }
      }),
    );
  }, [editor]);

  const onAddComment = () => {
    const domSelection = window.getSelection();
    domSelection.removeAllRanges();
    setShowCommentInput(true);
  };

  if (showCommentInput) {
    return createPortal(<CommentInputBox editor={editor} />, document.body);
  }

  if (activeAnchorKey === null) {
    return null;
  }

  return createPortal(
    <AddCommentBox
      anchorKey={activeAnchorKey}
      editor={editor}
      onAddComment={onAddComment}
    />,
    document.body,
  );
}
