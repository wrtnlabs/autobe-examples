import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentReportCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentReport.ICreate;
    discussionBoardCitizen: IEntity;
    discussionBoardCitizenSession: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      reporter_session_id: props.discussionBoardCitizenSession.id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // This field is required in database schema but cannot be determined from current context
      // Operation specification is flawed - needs comment: IEntity parameter in props
      comment: { connect: { id: "unknown" } }, // Temporary placeholder - MUST BE FIXED IN INTERFACE PHASE
    } satisfies Prisma.discussion_board_comment_reportsCreateInput;
  }
}
