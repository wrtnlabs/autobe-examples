import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";

export async function postCommunityPlatformCommentsCommentIdAttachments(props: {
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentAttachment.ICreate;
}): Promise<ICommunityPlatformCommentAttachment> {
  // Retrieve current authenticated user session (integration point)
  const session =
    (MyGlobal as any).userSession?.() ||
    (MyGlobal as any).currentSession?.() ||
    (MyGlobal as any).currentUserSession?.();
  if (!session || !session.id) {
    throw new HttpException(
      "Authentication required: user session not found",
      401,
    );
  }

  // Check if parent comment exists and is not soft-deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Parent comment not found", 404);
  }

  // Enforce uniqueness constraint for uri per comment
  const duplicate =
    await MyGlobal.prisma.community_platform_comment_attachments.findUnique({
      where: {
        comment_id_uri: { comment_id: props.commentId, uri: props.body.uri },
      },
      select: { id: true },
    });
  if (duplicate) {
    throw new HttpException(
      "Attachment with this URI has already been added to this comment",
      409,
    );
  }

  // Create attachment
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_comment_attachments.create({
      data: {
        id: v4(),
        comment_id: props.commentId,
        user_session_id: session.id,
        uri: props.body.uri,
        created_at: now,
      },
    });

  // Return DTO conforming result
  return {
    id: created.id,
    comment_id: created.comment_id,
    user_session_id: created.user_session_id,
    uri: created.uri,
    created_at: toISOStringSafe(created.created_at),
  };
}
