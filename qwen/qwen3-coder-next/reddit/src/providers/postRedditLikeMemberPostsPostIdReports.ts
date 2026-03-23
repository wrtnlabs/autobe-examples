import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
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

export async function postRedditLikeMemberPostsPostIdReports(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditLikeReport.ICreate;
}): Promise<IRedditLikeReport> {
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, author_id: true, deleted_at: true },
  });
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot report your own post", 403);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Cannot report a deleted post", 400);
  }
  const existingReport = await MyGlobal.prisma.reddit_like_reports.findUnique({
    where: {
      reporter_id_reported_post_id: {
        reporter_id: props.member.id,
        reported_post_id: props.postId,
      },
    },
  });
  if (existingReport) {
    throw new HttpException("Already reported this post", 400);
  }
  const report = await MyGlobal.prisma.reddit_like_reports.create({
    data: {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reporter_id: props.member.id,
      reported_post_id: props.postId,
    },
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(report);
}
