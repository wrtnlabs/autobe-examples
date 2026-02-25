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
  const timestamp = new Date().toISOString() as string &
    tags.Format<"date-time">;
  // Verify the section exists and is not already deleted
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  if (section.deleted_at !== null) {
    throw new HttpException("Section already deleted", 400);
  }
  // Check if the section contains articles that need to be handled
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
  });
  // Find default section (General) to reassign articles if available
  const defaultSection =
    await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: "General",
        deleted_at: null,
      },
    });
  if (articleCount > 0) {
    if (defaultSection && defaultSection.id !== props.sectionId) {
      // Move articles to default section
      await MyGlobal.prisma.discussion_board_articles.updateMany({
        where: { discussion_board_section_id: props.sectionId },
        data: {
          discussion_board_section_id: defaultSection.id,
          updated_at: timestamp,
        },
      });
    } else {
      // Delete articles if no default section available
      await MyGlobal.prisma.discussion_board_articles.updateMany({
        where: { discussion_board_section_id: props.sectionId },
        data: {
          deleted_at: timestamp,
          updated_at: timestamp,
        },
      });
    }
  }
  // Perform soft deletion of the section
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      deleted_at: timestamp,
      last_modified_by_admin_id: props.admin.id,
      updated_at: timestamp,
    },
  });
  // Log the deletion action in audit trail
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.admin.id,
      actor_type: "admin",
      action_type: "section_delete",
      action_subtype: "permanent",
      description: `Admin ${props.admin.id} deleted section "${section.name}" (ID: ${props.sectionId}) with ${articleCount} articles`,
      target_section_id: props.sectionId,
      success: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
  });
}
