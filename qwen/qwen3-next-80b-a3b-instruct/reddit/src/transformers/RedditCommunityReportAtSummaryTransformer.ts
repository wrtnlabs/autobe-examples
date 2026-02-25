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

export namespace RedditCommunityReportAtSummaryTransformer {
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
        reporter: {
          select: { username: true },
        },
        resolver: {
          select: { username: true },
        },
        postReport: {
          select: { id: true },
        } satisfies Prisma.reddit_community_report_of_postsFindManyArgs,
        commentReport: {
          select: { id: true },
        } satisfies Prisma.reddit_community_report_of_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityReport.ISummary> {
    const reporter_username = input.reporter?.username;
    const resolved_by_username = input.resolver?.username ?? null;
    const target_post_summary = input.postReport
      ? ({
          id: input.postReport.id,
          title: "",
          url: undefined,
          imageUrl: undefined,
          voteScore: 0,
          commentCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: {
            id: "",
            username: "",
            display_name: "",
            bio: undefined,
            avatar_url: undefined,
            karma_score: 0,
            created_at: new Date().toISOString(),
          },
          community: {
            id: "",
            name: "",
            description: "",
            icon_url: undefined,
            subscriber_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        } as IRedditCommunityPost.ISummary)
      : undefined;
    const target_comment_summary = input.commentReport
      ? ({
          id: input.commentReport.id,
          content: "",
          vote_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: {
            id: "",
            username: "",
            display_name: "",
            bio: undefined,
            avatar_url: undefined,
            karma_score: 0,
            created_at: new Date().toISOString(),
          },
        } as IRedditCommunityComment.ISummary)
      : undefined;
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      reporter_username: reporter_username ?? undefined,
      resolved_by_username,
      target_post_summary,
      target_comment_summary,
    };
  }
}
