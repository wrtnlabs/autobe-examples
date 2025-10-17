import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPortalMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPortalComment.IUpdate;
}): Promise<ICommunityPortalComment> {
  const { member, postId, commentId, body } = props;

  // Business validation
  if (body.body === undefined || body.body === null) {
    throw new HttpException("Bad Request: body is required", 400);
  }
  if (typeof body.body !== "string" || body.body.length === 0) {
    throw new HttpException("Bad Request: body must not be empty", 400);
  }
  if (body.body.length > 10000) {
    throw new HttpException("Bad Request: body exceeds maximum length", 400);
  }

  // Fetch comment with post->community for authorization checks
  const comment = await MyGlobal.prisma.community_portal_comments.findUnique({
    where: { id: commentId },
    include: { post: { select: { community_id: true } } },
  });

  if (!comment) throw new HttpException("Not Found", 404);
  if (comment.post_id !== postId) throw new HttpException("Not Found", 404);
  if (comment.deleted_at !== null) throw new HttpException("Not Found", 404);

  // Authorization: author OR active admin OR active community moderator
  const isAuthor = comment.author_user_id === member.id;
  if (!isAuthor) {
    const admin = await MyGlobal.prisma.community_portal_admins.findFirst({
      where: { user_id: member.id, is_active: true },
    });

    if (!admin) {
      const moderator =
        await MyGlobal.prisma.community_portal_moderators.findFirst({
          where: {
            user_id: member.id,
            community_id: comment.post.community_id,
            is_active: true,
          },
        });

      if (!moderator)
        throw new HttpException("Forbidden: insufficient permissions", 403);
    }
  }

  // Prepare timestamp once and update
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.community_portal_comments.update({
    where: { id: commentId },
    data: {
      body: body.body,
      updated_at: now,
    },
  });

  /**
   * SCHEMA-INTERFACE NOTE: The API contract requires audit logging of edits but
   * the provided Prisma schema does not include a dedicated audit table.
   * Therefore this implementation updates the comment but does not persist an
   * audit record in the database. Add an audit table (e.g., audit_logs) or
   * external logging service to satisfy audit requirements in the future.
   */

  return {
    id: updated.id as string & tags.Format<"uuid">,
    post_id: updated.post_id as string & tags.Format<"uuid">,
    parent_comment_id:
      updated.parent_comment_id === null
        ? null
        : (updated.parent_comment_id as string & tags.Format<"uuid">),
    author_user_id:
      updated.author_user_id === null
        ? null
        : (updated.author_user_id as string & tags.Format<"uuid">),
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
