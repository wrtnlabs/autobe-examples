import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentTransformer } from "./RedditLikeCommentTransformer";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostTransformer } from "./RedditLikePostTransformer";
import { RedditLikeReportSnapshotAtSummaryTransformer } from "./RedditLikeReportSnapshotAtSummaryTransformer";

export namespace RedditLikeReportTransformer {
  export type Payload = Prisma.reddit_like_reportsGetPayload<
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
        reporter: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        reportOfPost: {
          select: {
            id: true,
            post: RedditLikePostTransformer.select(),
          },
        } satisfies Prisma.reddit_like_report_of_postsFindManyArgs,
        commentReport: {
          select: {
            id: true,
            comment: RedditLikeCommentTransformer.select(),
          },
        } satisfies Prisma.reddit_like_report_of_commentsFindManyArgs,
        snapshots: RedditLikeReportSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_reportsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeReport> {
    // Handle polymorphic content - either post or comment
    let content: IRedditLikePost | IRedditLikeComment;
    if (input.reportOfPost) {
      content = await RedditLikePostTransformer.transform(
        input.reportOfPost.post,
      );
    } else if (input.commentReport) {
      content = await RedditLikeCommentTransformer.transform(
        input.commentReport.comment,
      );
    } else {
      throw new Error("Report must have either a post or comment target");
    }
    return {
      id: input.id,
      reporter: await RedditLikeMemberAtSummaryTransformer.transform(
        input.reporter,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reason: input.reason,
      status: input.status as IRedditLikeReport["status"],
      content,
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        RedditLikeReportSnapshotAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
