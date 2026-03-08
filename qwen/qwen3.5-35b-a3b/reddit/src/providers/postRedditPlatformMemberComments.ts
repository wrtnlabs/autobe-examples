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
  // Validate that either post_id or parent_id is provided
  const { post_id, parent_id } = props.body;
  const hasPost = post_id !== undefined && post_id !== null;
  const hasParent = parent_id !== undefined && parent_id !== null;
  if (!hasPost && !hasParent) {
    throw new HttpException(
      "Either post_id or parent_id must be provided",
      400,
    );
  }
  if (hasPost && hasParent) {
    throw new HttpException("Cannot provide both post_id and parent_id", 400);
  }
  // Verify member exists and is not deleted
  const member = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (member === null) {
    throw new HttpException("Member not found or deleted", 403);
  }
  // Verify target post exists and is not deleted (if post_id provided)
  let postId: string | null = null;
  if (hasPost) {
    const post = await MyGlobal.prisma.reddit_platform_posts.findFirst({
      where: {
        id: post_id!,
        deleted_at: null,
      },
    });
    if (post === null) {
      throw new HttpException("Post not found or deleted", 404);
    }
    postId = post_id!;
    // Check if member is banned from the community containing the post
    const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: post.reddit_platform_community_id,
        bannedUser: {
          id: props.member.id,
        },
        deleted_at: null,
      },
    });
    if (ban !== null) {
      throw new HttpException("You are banned from this community", 403);
    }
  }
  // Verify target parent comment exists and is not deleted (if parent_id provided)
  let parentId: string | null = null;
  if (hasParent) {
    const parentComment =
      await MyGlobal.prisma.reddit_platform_comments.findFirst({
        where: {
          id: parent_id!,
          deleted_at: null,
        },
      });
    if (parentComment === null) {
      throw new HttpException("Parent comment not found or deleted", 404);
    }
    parentId = parent_id!;
    // Check if parent comment's post is deleted
    if (parentComment.post_id !== null) {
      const parentPost = await MyGlobal.prisma.reddit_platform_posts.findFirst({
        where: {
          id: parentComment.post_id,
          deleted_at: null,
        },
      });
      if (parentPost === null) {
        throw new HttpException("Parent post not found or deleted", 404);
      }
      // Check if member is banned from the community
      const ban =
        await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
          where: {
            community_id: parentPost.reddit_platform_community_id,
            bannedUser: {
              id: props.member.id,
            },
            deleted_at: null,
          },
        });
      if (ban !== null) {
        throw new HttpException("You are banned from this community", 403);
      }
    }
  }
  // Create the comment using the collector
  const created = await MyGlobal.prisma.reddit_platform_comments.create({
    data: await RedditPlatformCommentCollector.collect({
      body: props.body,
      redditPlatformMembers: { id: props.member.id },
    }),
    ...RedditPlatformCommentTransformer.select(),
  });
  // Update post's comment_count if this is a top-level comment
  if (hasPost) {
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: { id: postId! },
      data: {
        comment_count: { increment: 1 },
      },
    });
  }
  // Transform and return the created comment
  return await RedditPlatformCommentTransformer.transform(created);
}
