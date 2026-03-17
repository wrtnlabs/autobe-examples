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
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeReportCollector } from "../collectors/RedditLikeReportCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberReports(props: {
  member: AdminPayload;
  body: IRedditLikeReport.ICreate;
}): Promise<IRedditLikeReport> {
  // Validate exactly one of postId or commentId is provided
  if (
    (props.body.postId === null && props.body.commentId === null) ||
    (props.body.postId !== null && props.body.commentId !== null)
  ) {
    throw new HttpException(
      "Exactly one of postId or commentId must be provided",
      400,
    );
  }
  // Validate community exists
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.body.communityId },
  });
  // Validate target content and check for existing reports
  if (props.body.postId !== null) {
    // Validate post exists and belongs to community
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: props.body.postId },
      select: { community_id: true },
    });
    if (post.community_id !== props.body.communityId) {
      throw new HttpException(
        "Post does not belong to the specified community",
        400,
      );
    }
    // Check for existing report by this member
    const existingReport = await MyGlobal.prisma.reddit_like_reports.findFirst({
      where: {
        reporter_id: props.member.id,
        reportOfPost: {
          reddit_like_post_id: props.body.postId,
        },
      },
    });
    if (existingReport !== null) {
      throw new HttpException("You have already reported this post", 409);
    }
  } else {
    // props.body.commentId is not null
    const commentId = props.body.commentId as string;
    // Validate comment exists and belongs to community
    const comment =
      await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
        where: { id: commentId },
        select: {
          post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: comment.post_id },
      select: { community_id: true },
    });
    if (post.community_id !== props.body.communityId) {
      throw new HttpException(
        "Comment does not belong to the specified community",
        400,
      );
    }
    // Check for existing report by this member
    const existingReport = await MyGlobal.prisma.reddit_like_reports.findFirst({
      where: {
        reporter_id: props.member.id,
        commentReport: {
          comment_id: commentId,
        },
      },
    });
    if (existingReport !== null) {
      throw new HttpException("You have already reported this comment", 409);
    }
  }
  // Create the report using collector
  const reportData = await RedditLikeReportCollector.collect({
    body: props.body,
    redditLikeMembers: { id: props.member.id },
  });
  const created = await MyGlobal.prisma.reddit_like_reports.create({
    data: reportData,
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(created);
}
