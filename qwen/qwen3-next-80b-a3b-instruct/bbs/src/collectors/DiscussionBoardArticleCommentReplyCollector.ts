import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCommentReply";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleCommentReplyCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleCommentReply.ICreate;
    discussionBoardComments: IEntity;
    discussionBoardCitizen: IEntity;
  }) {
    return {
      id: v4(),
      content: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      parent: {
        connect: { id: props.discussionBoardComments.id },
      },
      author: {
        connect: { id: props.discussionBoardCitizen.id },
      },
    } satisfies Prisma.discussion_board_comment_repliesCreateInput;
  }
}
