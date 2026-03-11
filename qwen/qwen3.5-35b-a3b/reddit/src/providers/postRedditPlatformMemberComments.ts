import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentCollector } from "../collectors/RedditPlatformCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentTransformer } from "../transformers/RedditPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberComments(props: {
  member: MemberPayload;
  body: IRedditPlatformComment.ICreate;
}): Promise<IRedditPlatformComment> {
  // Validate exactly one of post_id or parent_id is provided
  const hasPostId =
    props.body.postId !== undefined && props.body.postId !== null;
  const hasParentId =
    props.body.parentId !== undefined && props.body.parentId !== null;
  if (!hasPostId && !hasParentId) {
    throw new HttpException(
      "Either post_id or parent_id must be provided",
      400,
    );
  }
  if (hasPostId && hasParentId) {
    throw new HttpException("Cannot provide both post_id and parent_id", 400);
  }
  // If post_id provided, verify post exists and get community_id
  let communityId: (string & tags.Format<"uuid">) | null = null;
  if (hasPostId) {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: {
        id: props.body.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community: true,
      },
    });
    communityId = post.community.id;
  }
  // If parent_id provided, verify parent comment exists
  if (hasParentId) {
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: {
        id: props.body.parentId,
        deleted_at: null,
      },
    });
  }
  // If post_id provided, verify member is not banned from community
  if (communityId) {
    const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: communityId,
        bannedUser: {
          id: props.member.id,
        },
        deleted_at: null,
      },
    });
    if (ban) {
      throw new HttpException("You are banned from this community", 403);
    }
  }
  // Create comment using collector
  const created = await MyGlobal.prisma.reddit_platform_comments.create({
    data: await RedditPlatformCommentCollector.collect({
      body: props.body,
      redditPlatformMembers: {
        id: props.member.id,
      },
    }),
    ...RedditPlatformCommentTransformer.select(),
  });
  return await RedditPlatformCommentTransformer.transform(created);
}
