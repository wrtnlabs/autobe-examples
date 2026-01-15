import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentReportTransformer {
  export type Payload = Prisma.discussion_board_comment_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        comment: {
          select: {
            id: true,
          },
        },
        reporter_session_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentReport> {
    return {
      id: input.id,
      commentId: input.comment.id,
      reporterId: input.reporter_session_id,
      reason: input.reason as IDiscussionBoardCommentReport["reason"],
      createdAt: input.created_at.toISOString(),
      status: "pending", // Hardcoded system default status
    };
  }
}
