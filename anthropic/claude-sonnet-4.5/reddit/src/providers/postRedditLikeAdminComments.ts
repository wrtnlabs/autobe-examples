import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminComments(props: {
  admin: AdminPayload;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  const { admin, body } = props;

  const post = await MyGlobal.prisma.reddit_like_posts.findFirst({
    where: {
      id: body.reddit_like_post_id,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  let depth = 0;
  if (body.reddit_like_parent_comment_id !== undefined) {
    const parentComment = await MyGlobal.prisma.reddit_like_comments.findFirst({
      where: {
        id: body.reddit_like_parent_comment_id,
        reddit_like_post_id: body.reddit_like_post_id,
        deleted_at: null,
      },
    });

    if (!parentComment) {
      throw new HttpException(
        "Parent comment not found or has been deleted",
        404,
      );
    }

    depth = parentComment.depth + 1;

    if (depth > 10) {
      throw new HttpException(
        "Maximum comment nesting depth of 10 levels exceeded",
        400,
      );
    }
  }

  const adminRecord = await MyGlobal.prisma.reddit_like_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }

  const memberRecord = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      email: adminRecord.email,
      deleted_at: null,
    },
  });

  if (!memberRecord) {
    throw new HttpException(
      "Admin must have a member account to post comments",
      403,
    );
  }

  const communityBan =
    await MyGlobal.prisma.reddit_like_community_bans.findFirst({
      where: {
        banned_member_id: memberRecord.id,
        community_id: post.reddit_like_community_id,
        is_active: true,
        deleted_at: null,
      },
    });

  if (communityBan) {
    throw new HttpException("You are banned from this community", 403);
  }

  const now = toISOStringSafe(new Date());
  const commentId = v4();

  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: {
      id: commentId,
      reddit_like_post_id: body.reddit_like_post_id,
      reddit_like_parent_comment_id: body.reddit_like_parent_comment_id ?? null,
      reddit_like_member_id: memberRecord.id,
      content_text: body.content_text,
      depth: depth,
      vote_score: 0,
      edited: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reddit_like_post_id: created.reddit_like_post_id,
    reddit_like_parent_comment_id:
      created.reddit_like_parent_comment_id ?? undefined,
    content_text: created.content_text,
    depth: created.depth,
    vote_score: created.vote_score,
    edited: created.edited,
    created_at: now,
    updated_at: now,
  };
}
