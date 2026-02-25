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
    discussionBoardAdmins: IEntity;
  }) {
    return {
      id: v4(),
      action_type: props.body.action_type,
      reason: props.body.reason,
      status: props.body.status ?? "completed",
      created_at: new Date(),
      updated_at: new Date(),
      comment: { connect: { id: props.body.discussion_board_comment_id } },
      admin: { connect: { id: props.discussionBoardAdmins.id } },
    } satisfies Prisma.discussion_board_comment_moderationsCreateInput;
  }
}
