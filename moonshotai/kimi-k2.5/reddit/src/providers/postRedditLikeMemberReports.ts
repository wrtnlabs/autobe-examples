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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberReports(props: {
  member: MemberPayload;
  body: IRedditLikeReport.ICreate;
}): Promise<IRedditLikeReport> {
  // Validate exactly one target is provided
  const hasPost = props.body.postId !== null;
  const hasComment = props.body.commentId !== null;
  if (hasPost && hasComment) {
    throw new HttpException(
      "Cannot report both post and comment simultaneously",
      400,
    );
  }
  if (!hasPost && !hasComment) {
    throw new HttpException("Must provide either postId or commentId", 400);
  }
  // Validate target exists (either post or comment)
  if (hasPost) {
    await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: props.body.postId! },
    });
  } else {
    await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
      where: { id: props.body.commentId! },
    });
  }
  // Create the report - let database unique constraints handle duplicates if they exist
  const data = await RedditLikeReportCollector.collect({
    body: props.body,
    redditLikeMembers: { id: props.member.id },
    redditLikeMemberSessions: { id: props.member.session_id },
  });
  const created = await MyGlobal.prisma.reddit_like_reports.create({
    data,
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(created);
}
