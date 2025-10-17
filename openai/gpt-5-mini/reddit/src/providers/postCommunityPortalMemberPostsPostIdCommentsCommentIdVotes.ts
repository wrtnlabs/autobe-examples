import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPortalVote.ICreate;
}): Promise<ICommunityPortalVote> {
  const { member, postId, commentId, body } = props;

  // Validate vote value (business rule)
  if (body.value !== 1 && body.value !== -1) {
    throw new HttpException("Invalid vote value", 400);
  }

  // Verify parent post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }

  // Verify comment exists, is active, and belongs to the post
  const comment = await MyGlobal.prisma.community_portal_comments.findUnique({
    where: { id: commentId },
    select: { id: true, post_id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.post_id !== postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }

  // Verify member eligibility (email verified and not suspended)
  const membership = await MyGlobal.prisma.community_portal_members.findFirst({
    where: {
      user_id: member.id,
      is_email_verified: true,
      is_suspended: false,
    },
  });
  if (!membership) {
    throw new HttpException("Unauthorized: ineligible to vote", 401);
  }

  // Time value for created_at/updated_at
  const now = toISOStringSafe(new Date());

  // Check for existing active vote by this user on this comment
  const existing = await MyGlobal.prisma.community_portal_votes.findFirst({
    where: {
      user_id: member.id,
      comment_id: commentId,
      deleted_at: null,
    },
  });

  if (existing) {
    // If same value, return existing authoritative representation
    if (existing.value === body.value) {
      return {
        id: existing.id as string & tags.Format<"uuid">,
        user_id: existing.user_id as string & tags.Format<"uuid">,
        post_id: null,
        comment_id: existing.comment_id as string & tags.Format<"uuid">,
        value: existing.value as 1 | -1,
        created_at: toISOStringSafe(existing.created_at),
        updated_at: toISOStringSafe(existing.updated_at),
        deleted_at: existing.deleted_at
          ? toISOStringSafe(existing.deleted_at)
          : null,
      };
    }

    // Different value -> update the existing vote
    const updated = await MyGlobal.prisma.community_portal_votes.update({
      where: { id: existing.id },
      data: {
        value: body.value,
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      user_id: updated.user_id as string & tags.Format<"uuid">,
      post_id: null,
      comment_id: updated.comment_id as string & tags.Format<"uuid">,
      value: updated.value as 1 | -1,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  }

  // No existing vote -> create
  const created = await MyGlobal.prisma.community_portal_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: member.id,
      post_id: null,
      comment_id: commentId,
      value: body.value,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    post_id: null,
    comment_id: created.comment_id as string & tags.Format<"uuid">,
    value: created.value as 1 | -1,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
