import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentReportTransformer {
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
        reportedComment: DiscussionBoardCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentReport> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      resolution_details: input.resolution_details ?? null,
      resolved_at: input.resolved_at ? input.resolved_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      reporter: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.reporter,
      ),
      reportedComment:
        await DiscussionBoardCommentAtSummaryTransformer.transform(
          input.reportedComment,
        ),
    };
  }
}
