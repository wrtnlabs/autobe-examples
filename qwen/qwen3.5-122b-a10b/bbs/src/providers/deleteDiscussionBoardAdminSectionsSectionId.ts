import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  // Check if section contains any articles
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  if (articleCount > 0) {
    throw new HttpException(
      "Cannot delete section with articles. Remove or move all articles first.",
      400,
    );
  }
  // Delete the section (cascade handles articles, comments, attachments)
  await MyGlobal.prisma.discussion_board_sections.delete({
    where: { id: props.sectionId },
  });
  // Log audit trail
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: props.admin.id,
      actor_type: "admin",
      action_type: "section.delete",
      resource_type: "section",
      resource_id: props.sectionId,
      metadata: null,
      ip_address: null,
      user_agent: null,
      created_at: new Date(),
    },
  });
}
