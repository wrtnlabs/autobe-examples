import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentModerationCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentModeration.ICreate;
    discussionBoardComments: IEntity; // from path parameter commentId
    discussionBoardAdmins: IEntity; // from authorized actor
    discussionBoardAdminSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      action_type: props.body.action_type,
      reason: props.body.reason,
      status: "completed", // Default status for direct moderation actions
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      comment: { connect: { id: props.discussionBoardComments.id } },
      admin: { connect: { id: props.discussionBoardAdmins.id } },
    } satisfies Prisma.discussion_board_comment_moderationsCreateInput;
  }
}
