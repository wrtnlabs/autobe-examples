import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommentReportTransformer {
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
        comment: {
          select: {
            id: true,
          },
        },
        reporter: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_comment_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentReport> {
    return {
      id: input.id,
      comment_id: input.comment.id,
      reporter_id: input.reporter.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "dismissed">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      resolved_at: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : null,
    };
  }
}
