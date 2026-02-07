import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentFlagCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentFlag.ICreate;
    discussionBoardUsers: IEntity;
    discussionBoardComments: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      flag_reason: props.body.flag_reason,
      flag_type: props.body.flag_type,
      status: "pending",
      resolution_notes: null,
      created_at: new Date(),
      reviewed_at: null,
      resolved_at: null,
      // BelongsTo relations
      user: { connect: { id: props.discussionBoardUsers.id } },
      comment: { connect: { id: props.discussionBoardComments.id } },
      reviewer: undefined,
    } satisfies Prisma.discussion_board_comment_flagsCreateInput;
  }
}
