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
import { RedditLikeReportCollector } from "../collectors/RedditLikeReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberReports(props: {
  member: MemberPayload;
  body: IRedditLikeReport.ICreate;
}): Promise<IRedditLikeReport> {
  // Validate that exactly one content type is provided
  const hasPostId = props.body.reported_post_id !== undefined;
  const hasCommentId = props.body.reported_comment_id !== undefined;
  if (hasPostId === hasCommentId) {
    throw new HttpException(
      "Must provide exactly one of reported_post_id or reported_comment_id",
      400,
    );
  }
  // Validate reason is non-empty
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Report reason cannot be empty", 400);
  }
  // Create the report
  const created = await MyGlobal.prisma.reddit_like_reports.create({
    data: await RedditLikeReportCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
    }),
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(created);
}
