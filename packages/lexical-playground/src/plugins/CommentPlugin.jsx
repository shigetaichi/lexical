/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection, $isTextNode} from 'lexical';
import {useEffect, useState} from 'react';

export default function CommentPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const [activeBlockKey, setActiveBlockKey] = useState(null);

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      editorState.read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const anchorNode = selection.anchor.getNode();

          if ($isTextNode(anchorNode)) {
            debugger;
            return;
          }
        }
        setActiveBlockKey(null);
      });
    });
  }, [editor]);

  return null;
}
