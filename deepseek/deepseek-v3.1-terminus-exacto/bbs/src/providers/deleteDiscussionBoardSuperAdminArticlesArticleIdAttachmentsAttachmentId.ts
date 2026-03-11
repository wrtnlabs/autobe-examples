import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdAttachmentsAttachmentId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify super admin exists and is not deleted
  const superAdminAccount =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: props.superAdmin.id, deleted_at: null },
      select: { id: true, email: true },
    });
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, title: true, discussion_board_member_id: true },
    });
  // Verify attachment exists and belongs to this article
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUniqueOrThrow({
      where: { id: props.attachmentId },
      select: { id: true, storage_path: true, article_id: true },
    });
  if (attachment.article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to the specified article",
      400,
    );
  }
  // TODO: Delete physical file from storage using storage_path
  // This would call a storage service; for now we simulate:
  // await storageService.deleteFile(attachment.storage_path);
  // Delete the attachment record
  await MyGlobal.prisma.discussion_board_attachments.delete({
    where: { id: props.attachmentId },
  });
  // Create audit log entry
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "super_admin",
      actor_id: props.superAdmin.id,
      target_type: "attachment",
      target_id: attachment.id,
      action_type: "delete_attachment",
      action_details: `Super admin deleted attachment ${attachment.id} from article ${article.id} (${article.title})`,
      ip_address: undefined,
      user_agent: undefined,
      href: undefined,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}
