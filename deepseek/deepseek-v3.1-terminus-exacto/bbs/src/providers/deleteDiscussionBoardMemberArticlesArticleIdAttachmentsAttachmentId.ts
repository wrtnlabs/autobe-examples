import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify article exists and is active
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, deleted_at: null },
      select: { id: true, discussion_board_member_id: true, status: true },
    });
  // Check member status and permissions
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id, deleted_at: null, is_banned: false },
      select: { id: true, admin_grade: true },
    });
  const isAuthor = article.discussion_board_member_id === props.member.id;
  const isAdmin =
    member.admin_grade === "regular" || member.admin_grade === "super";
  if (!isAuthor && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify attachment exists and belongs to article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId, article_id: props.articleId },
      select: { id: true, storage_path: true },
    });
  // Use transaction for atomic operation
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete physical file from storage
    // Note: In production, this would use actual file storage service
    // For local filesystem:
    // import fs from "fs/promises";

    // await fs.unlink(attachment.storage_path).catch(() => {
    //   // Log warning but continue with database deletion
    //   console.warn(`File not found: ${attachment.storage_path}`);
    // });
    // Delete database record
    await tx.discussion_board_attachments.delete({
      where: { id: props.attachmentId },
    });
  });
  // Log deletion for audit (admin actions)
  if (isAdmin && !isAuthor) {
    console.log(
      `Admin ${props.member.id} deleted attachment ${props.attachmentId} from article ${props.articleId}`,
    );
  }
}
