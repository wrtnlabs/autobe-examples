import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentReportAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        resolution_details: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        reporter: DiscussionBoardUserAtSummaryTransformer.select(),
        reportedComment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentReport.ISummary> {
    return {
      id: input.id,
      reporter: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.reporter,
      ),
      reason: input.reason,
      status: input.status as "pending" | "under_review" | "resolved",
      created_at: input.created_at.toISOString(),
      resolved_at: input.resolved_at?.toISOString() ?? null,
    };
  }
}
