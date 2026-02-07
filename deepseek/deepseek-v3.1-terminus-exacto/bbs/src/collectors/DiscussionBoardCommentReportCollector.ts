import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentReportCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentReport.ICreate;
    discussionBoardUsers: IEntity;
    discussionBoardComments: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "pending",
      resolution_details: null,
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      reporter: { connect: { id: props.discussionBoardUsers.id } },
      reportedComment: { connect: { id: props.discussionBoardComments.id } },
    } satisfies Prisma.discussion_board_comment_reportsCreateInput;
  }
}
