import { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentMentionCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentMention.ICreate;
    discussionBoardComments: IEntity; // from path parameter commentId
    discussionBoardUsers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    return {
      id,
      position_start: props.body.position_start,
      position_end: props.body.position_end,
      created_at: new Date(),
      comment: { connect: { id: props.discussionBoardComments.id } },
      mentionedUser: { connect: { id: props.body.discussion_board_user_id } },
    } satisfies Prisma.discussion_board_comment_mentionsCreateInput;
  }
}
