import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentCollector } from "../collectors/RedditCloneCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.ICreate;
}): Promise<IRedditCloneComment> {
  // 1. Validate post exists and get community info
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      deleted_at: true,
    },
  });
  // 2. Check if post is soft-deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 3. Get member's user profile
  const userProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { reddit_clone_member_id: props.member.id },
      select: { id: true },
    });
  // 4. Check if member is banned from the community
  const ban = await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
    where: {
      reddit_clone_community_id: post.reddit_clone_community_id,
      reddit_clone_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // 5. Validate parent comment if provided
  if (props.body.parentCommentId) {
    const parentComment =
      await MyGlobal.prisma.reddit_clone_comments.findUnique({
        where: { id: props.body.parentCommentId },
        select: {
          id: true,
          reddit_clone_post_id: true,
          deleted_at: true,
        },
      });
    if (parentComment === null) {
      throw new HttpException("Parent comment not found", 400);
    }
    if (parentComment.deleted_at !== null) {
      throw new HttpException("Parent comment not found", 400);
    }
    if (parentComment.reddit_clone_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  // 6. Create the comment using collector and transformer
  const record = await MyGlobal.prisma.reddit_clone_comments.create({
    data: await RedditCloneCommentCollector.collect({
      body: props.body,
      post: { id: post.id },
      userProfile: { id: userProfile.id },
    }),
    ...RedditCloneCommentTransformer.select(),
  });
  return await RedditCloneCommentTransformer.transform(record);
}
