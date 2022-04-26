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
import {useEffect, useRef, useState} from 'react';
import * as React from 'react';
// $FlowFixMe: Flow doesn't see react-dom module
import {createPortal} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

function AddCommentBox({
  anchorKey,
  editor,
}: {
  anchorKey: NodeKey,
  editor: LexicalEditor,
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
    <div className="CommentPlugin_CommentBox" ref={boxRef}>
      <button className="CommentPlugin_CommentBox_button">
        <i className="icon add-comment" />
      </button>
    </div>
  );
}

export default function CommentPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const [activeAnchorKey, setActiveAnchorKey] = useState(null);

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

  if (activeAnchorKey === null) {
    return null;
  }

  return createPortal(
    <AddCommentBox anchorKey={activeAnchorKey} editor={editor} />,
    document.body,
  );
}
