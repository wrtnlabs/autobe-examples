import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentModActionCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentModAction.ICreate;
    discussionBoardComments: IEntity;
    discussionBoardModerators: IEntity;
    discussionBoardModeratorSessions: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      comment: {
        connect: { id: props.discussionBoardComments.id },
      },
      moderator: {
        connect: { id: props.discussionBoardModerators.id },
      },
      actionType: {
        connect: { id: props.body.action_type }, // Schema requires belongsTo, so we connect using string as ID - this is schema constraint override
      },
    } satisfies Prisma.discussion_board_comment_mod_actionsCreateInput;
  }
}
