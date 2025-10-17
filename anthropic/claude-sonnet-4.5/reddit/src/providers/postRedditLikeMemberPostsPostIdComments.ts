import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  const { member, postId, body } = props;

  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_like_community_id: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Verify member is not banned from the community
  const activeBan = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      banned_member_id: member.id,
      community_id: post.reddit_like_community_id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (activeBan) {
    throw new HttpException(
      "You are banned from this community and cannot create comments",
      403,
    );
  }

  // Calculate depth and verify parent comment if provided
  let commentDepth = 0;

  if (
    body.reddit_like_parent_comment_id !== undefined &&
    body.reddit_like_parent_comment_id !== null
  ) {
    const parentComment = await MyGlobal.prisma.reddit_like_comments.findFirst({
      where: {
        id: body.reddit_like_parent_comment_id,
        reddit_like_post_id: postId,
        deleted_at: null,
      },
      select: {
        id: true,
        depth: true,
      },
    });

    if (!parentComment) {
      throw new HttpException(
        "Parent comment not found or does not belong to this post",
        404,
      );
    }

    commentDepth = parentComment.depth + 1;

    // Enforce maximum nesting depth of 10
    if (commentDepth > 10) {
      throw new HttpException(
        "Maximum comment nesting depth of 10 levels exceeded",
        400,
      );
    }
  }

  // Create the comment with all required fields
  const now = toISOStringSafe(new Date());
  const commentId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: {
      id: commentId,
      reddit_like_post_id: postId,
      reddit_like_parent_comment_id: body.reddit_like_parent_comment_id ?? null,
      reddit_like_member_id: member.id,
      content_text: body.content_text,
      depth: commentDepth,
      vote_score: 0,
      edited: false,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created comment with proper type conversions
  return {
    id: created.id as string & tags.Format<"uuid">,
    reddit_like_post_id: created.reddit_like_post_id as string &
      tags.Format<"uuid">,
    reddit_like_parent_comment_id:
      created.reddit_like_parent_comment_id === null
        ? undefined
        : (created.reddit_like_parent_comment_id as string &
            tags.Format<"uuid">),
    content_text: created.content_text,
    depth: created.depth,
    vote_score: created.vote_score,
    edited: created.edited,
    created_at: now,
    updated_at: now,
  };
}
