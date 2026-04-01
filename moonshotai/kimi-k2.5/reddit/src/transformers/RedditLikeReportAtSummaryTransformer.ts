import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikeReportAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeReport.ISummary> {
    // Polymorphic reportedContent handling
    let reportedContent: IRedditLikePost.ISummary | IRedditLikeComment.ISummary;
    if (input.reportOfPost) {
      reportedContent = await RedditLikePostAtSummaryTransformer.transform(
        input.reportOfPost.post,
      );
    } else if (input.commentReport) {
      reportedContent = await RedditLikeCommentAtSummaryTransformer.transform(
        input.commentReport.comment,
      );
    } else {
      throw new Error(
        "Report has no associated content (neither post nor comment)",
      );
    }
    return {
      id: input.id,
      reason: input.reason,
      status: input.status as "pending" | "approved" | "dismissed",
      createdAt: input.created_at.toISOString(),
      reporter: await RedditLikeMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reportedContent,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        reporter: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        reportOfPost: {
          select: {
            post: RedditLikePostAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_like_report_of_postsFindManyArgs,
        commentReport: {
          select: {
            comment: RedditLikeCommentAtSummaryTransformer.select(),
          },
        } satisfies Prisma.reddit_like_report_of_commentsFindManyArgs,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_report_snapshotsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_reportsFindManyArgs;
  }
}
