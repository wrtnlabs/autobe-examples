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

export async function postRedditLikeMemberComments(props: {
  member: MemberPayload;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  const { member, body } = props;

  // Validate post exists and get community context
  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: body.reddit_like_post_id,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Calculate depth and validate parent comment if provided
  let depth = 0;
  if (
    body.reddit_like_parent_comment_id !== undefined &&
    body.reddit_like_parent_comment_id !== null
  ) {
    const parentComment = await MyGlobal.prisma.reddit_like_comments.findFirst({
      where: {
        id: body.reddit_like_parent_comment_id,
        reddit_like_post_id: body.reddit_like_post_id,
        deleted_at: null,
      },
    });

    if (!parentComment) {
      throw new HttpException("Parent comment not found or invalid", 404);
    }

    depth = parentComment.depth + 1;

    if (depth > 10) {
      throw new HttpException(
        "Maximum nesting depth of 10 levels exceeded",
        400,
      );
    }
  }

  // Check if member is banned from the community
  const activeBan = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      banned_member_id: member.id,
      community_id: post.reddit_like_community_id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (activeBan) {
    throw new HttpException("You are banned from this community", 403);
  }

  // Create the comment with prepared timestamp
  const now = toISOStringSafe(new Date());
  const commentId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: {
      id: commentId,
      reddit_like_post_id: body.reddit_like_post_id,
      reddit_like_parent_comment_id:
        body.reddit_like_parent_comment_id ?? undefined,
      reddit_like_member_id: member.id,
      content_text: body.content_text,
      depth: depth,
      vote_score: 0,
      edited: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    reddit_like_post_id: created.reddit_like_post_id as string &
      tags.Format<"uuid">,
    reddit_like_parent_comment_id: created.reddit_like_parent_comment_id
      ? (created.reddit_like_parent_comment_id as string & tags.Format<"uuid">)
      : undefined,
    content_text: created.content_text,
    depth: created.depth,
    vote_score: created.vote_score,
    edited: created.edited,
    created_at: now,
    updated_at: now,
  };
}
