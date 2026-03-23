import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneReportCollector } from "../collectors/RedditCloneReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberReports(props: {
  member: MemberPayload;
  body: IRedditCloneReport.ICreate;
}): Promise<IRedditCloneReport> {
  // Validate that exactly one of post_id or comment_id is provided
  const hasPostId = props.body.post_id != null && props.body.post_id !== "";
  const hasCommentId =
    props.body.comment_id != null && props.body.comment_id !== "";
  if (hasPostId && hasCommentId) {
    throw new HttpException("Cannot report both post and comment", 400);
  }
  if (!hasPostId && !hasCommentId) {
    throw new HttpException("Must provide either post_id or comment_id", 400);
  }
  // Validate content_type matches the provided ID
  if (hasPostId && props.body.content_type !== "post") {
    throw new HttpException(
      "content_type must be 'post' when post_id is provided",
      400,
    );
  }
  if (hasCommentId && props.body.content_type !== "comment") {
    throw new HttpException(
      "content_type must be 'comment' when comment_id is provided",
      400,
    );
  }
  // Verify content exists and is not deleted, and get community_id
  let communityId: string;
  if (hasPostId && props.body.post_id) {
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: {
        id: props.body.post_id,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_clone_community_id: true,
      },
    });
    communityId = post.reddit_clone_community_id;
  } else if (hasCommentId && props.body.comment_id) {
    const comment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: {
          id: props.body.comment_id,
          deleted_at: null,
        },
        select: {
          id: true,
          reddit_clone_post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: {
        id: comment.reddit_clone_post_id,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_clone_community_id: true,
      },
    });
    communityId = post.reddit_clone_community_id;
  } else {
    throw new HttpException("Invalid report parameters", 400);
  }
  // Check if user is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      member_id: props.member.id,
      community_id: communityId,
      lifted_at: null,
      deleted_at: null,
    },
  });
  if (ban != null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Create the report using the collector
  const created = await MyGlobal.prisma.reddit_clone_reports.create({
    data: await RedditCloneReportCollector.collect({
      body: props.body,
      redditCloneMembers: {
        id: props.member.id,
      } satisfies IEntity,
    }),
    ...RedditCloneReportTransformer.select(),
  });
  return await RedditCloneReportTransformer.transform(created);
}
