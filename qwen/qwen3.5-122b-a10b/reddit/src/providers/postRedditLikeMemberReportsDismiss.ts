import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberReportsDismiss(props: {
  member: MemberPayload;
  body: IRedditLikeReport.IDismiss;
}): Promise<IRedditLikeReport> {
  const report = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: {
      id: props.body.id,
      deleted_at: null,
    },
    ...RedditLikeReportTransformer.select(),
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 409);
  }
  if (report.redditLikeMember.id === props.member.id) {
    throw new HttpException("Cannot dismiss your own report", 403);
  }
  let communityId: string;
  if (report.actor_type === "post") {
    if (!report.postTarget) {
      throw new HttpException("Report has no post target", 400);
    }
    communityId = report.postTarget.post.community.id;
  } else if (report.actor_type === "comment") {
    if (!report.commentTarget) {
      throw new HttpException("Report has no comment target", 400);
    }
    const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
      where: { id: report.commentTarget.comment.id },
      select: { reddit_like_post_id: true },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
      where: { id: comment.reddit_like_post_id },
      select: { reddit_like_community_id: true },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
    communityId = post.reddit_like_community_id;
  } else {
    throw new HttpException("Invalid actor type", 400);
  }
  const isOwner = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      owner_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!isOwner) {
    const isModerator =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_id: communityId,
          reddit_like_member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!isModerator) {
      throw new HttpException("Not authorized to dismiss this report", 403);
    }
  }
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.body.id },
    data: {
      status: "dismissed",
      updated_at: new Date(),
    },
  });
  const updatedReport = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: {
      id: props.body.id,
      deleted_at: null,
    },
    ...RedditLikeReportTransformer.select(),
  });
  if (!updatedReport) {
    throw new HttpException("Report not found after update", 404);
  }
  return await RedditLikeReportTransformer.transform(updatedReport);
}
