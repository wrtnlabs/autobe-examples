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
import { RedditLikeReportCollector } from "../collectors/RedditLikeReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberReports(props: {
  member: MemberPayload;
  body: IRedditLikeReport.ICreate;
}): Promise<IRedditLikeReport> {
  // Validate target exists and check self-reporting
  if (props.body.targetType === "post") {
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: props.body.targetId },
      select: { reddit_like_member_id: true },
    } satisfies Prisma.reddit_like_postsFindUniqueArgs);
    if (post.reddit_like_member_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  } else if (props.body.targetType === "comment") {
    const comment =
      await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
        where: { id: props.body.targetId },
        select: { reddit_like_member_id: true },
      } satisfies Prisma.reddit_like_commentsFindUniqueArgs);
    if (comment.reddit_like_member_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  }
  // Create report using collector
  const record = await MyGlobal.prisma.reddit_like_reports.create({
    data: await RedditLikeReportCollector.collect({
      body: props.body,
      redditLikeMember: { id: props.member.id } satisfies IEntity,
    }),
    ...RedditLikeReportTransformer.select(),
  } satisfies Prisma.reddit_like_reportsCreateArgs);
  // Transform and return
  return await RedditLikeReportTransformer.transform(record);
}
