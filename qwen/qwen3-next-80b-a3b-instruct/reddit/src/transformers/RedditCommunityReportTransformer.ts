import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityReportTransformer {
  export type Payload = Prisma.reddit_community_reportsGetPayload<
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
        deleted_at: true,
        reporter: RedditCommunityMemberAtSummaryTransformer.select(),
        resolver: RedditCommunityMemberAtSummaryTransformer.select(),
        postReport: RedditCommunityPostAtSummaryTransformer.select(),
        commentReport: RedditCommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReport> {
    const status = input.status as "pending" | "approved" | "dismissed";
    if (
      status !== "pending" &&
      status !== "approved" &&
      status !== "dismissed"
    ) {
      throw new Error(`Invalid status value: ${input.status}`);
    }
    return {
      id: input.id,
      reason: input.reason,
      status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      reporter: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      resolved_by_user: input.resolver
        ? await RedditCommunityMemberAtSummaryTransformer.transform(
            input.resolver,
          )
        : undefined,
      target: input.postReport
        ? await RedditCommunityPostAtSummaryTransformer.transform(
            input.postReport,
          )
        : input.commentReport
          ? await RedditCommunityCommentAtSummaryTransformer.transform(
              input.commentReport,
            )
          : (() => {
              throw new Error(
                "Database integrity violated: report must have exactly one target (post or comment)",
              );
            })(),
    };
  }
}
