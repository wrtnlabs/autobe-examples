import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function postRedditPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.ICreate;
}): Promise<IRedditPlatformComment> {
  // 1. Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, community_id: true, deleted_at: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  if (post.deleted_at !== null) {
    throw new HttpException("Cannot comment on deleted post", 400);
  }
  // 2. Check if member is banned from the community
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      reddit_platform_community_id: post.community_id,
      reddit_platform_member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // 3. Validate parent comment if provided
  if (
    props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.reddit_platform_comments.findFirst({
        where: {
          id: props.body.parent_comment_id,
          reddit_platform_post_id: props.postId,
          deleted_at: null,
        },
      });
    if (parentComment === null) {
      throw new HttpException(
        "Parent comment not found or does not belong to this post",
        400,
      );
    }
  }
  // 4. Create comment
  const commentData = await RedditPlatformCommentCollector.collect({
    body: props.body,
    redditPlatformPosts: { id: props.postId },
    redditPlatformMembers: { id: props.member.id },
  });
  const comment = await MyGlobal.prisma.reddit_platform_comments.create({
    data: commentData,
    ...RedditPlatformCommentTransformer.select(),
  });
  // 5. Transform and return
  return await RedditPlatformCommentTransformer.transform(comment);
}
