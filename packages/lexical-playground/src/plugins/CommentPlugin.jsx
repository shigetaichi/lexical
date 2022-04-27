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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection, $isTextNode} from 'lexical';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
// $FlowFixMe: Flow doesn't see react-dom module
import {createPortal} from 'react-dom';
import invariant from 'shared/invariant';
import useLayoutEffect from 'shared/useLayoutEffect';

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

function CommentInputBox({editor}: {editor: LexicalEditor}) {
  const boxRef = useRef(null);

  useLayoutEffect(() => {
    const domSelection = window.getSelection();
    const boxElem = boxRef.current;
    const range = domSelection.getRangeAt(0);
    if (range != null && boxElem !== null) {
      const {left, top} = range.getBoundingClientRect();
      boxElem.style.left = `${left - 270}px`;
      boxElem.style.top = `${top - 20}px`;
    }
  }, []);

  return <div className="CommentPlugin_CommentInputBox" ref={boxRef} />;
}

export function CommentPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const [activeAnchorKey, setActiveAnchorKey] = useState(null);
  const {isActive, setActive} = useCommentContext();
  const [showCommentInput, setShowCommentInput] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
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
    });
  }, [editor]);

  const onAddComment = () => {
    setActive(true);
    setShowCommentInput(true);
  };

  if (showCommentInput) {
    return createPortal(<CommentInputBox editor={editor} />, document.body);
  }

  if (activeAnchorKey === null || isActive) {
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

const ReactCommentContext: React$Context<null | CommentContextType> =
  createContext(null);

export function CommentContext({children}: {children: React$Node}): React$Node {
  const [isActive, setIsActive] = useState(false);
  const setActive = useCallback((value) => {
    setIsActive(value);
  }, []);
  const contextValue = useMemo(
    () => ({
      isActive,
      setActive,
    }),
    [isActive, setActive],
  );

  return (
    <ReactCommentContext.Provider value={contextValue}>
      {children}
    </ReactCommentContext.Provider>
  );
}

export function useCommentContext(): CommentContextType {
  const value = useContext(ReactCommentContext);
  invariant(
    value !== null,
    'useCommentContext: missing CommentContext component in tree',
  );
  return value;
}
