import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommentReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_comment_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
        comment: true,
        reporter: true,
      },
    } satisfies Prisma.reddit_community_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentReport.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "dismissed">(input.status),
      created_at: toISOStringSafe(input.created_at),
      comment_id: input.comment.id,
      reporter_id: input.reporter.id,
    };
  }
}
