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

export async function deleteDiscussionBoardAdminSectionsSectionIdFilesFileId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify section exists and is active
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: {
        id: true,
        created_by_admin_id: true,
      },
    });
  // Additional permission check: verify admin created the section or has section admin privileges
  if (section.created_by_admin_id !== props.admin.id) {
    // Check if admin has section administrator privileges
    const sectionAdmin =
      await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
        where: {
          discussion_board_section_id: props.sectionId,
          discussion_board_admin_id: props.admin.id,
          deleted_at: null,
        },
      });
    if (!sectionAdmin) {
      throw new HttpException(
        "Insufficient permissions to manage files in this section",
        403,
      );
    }
  }
  // Verify file exists and belongs to specified section
  const file =
    await MyGlobal.prisma.discussion_board_section_files.findUniqueOrThrow({
      where: {
        id: props.fileId,
        discussion_board_section_id: props.sectionId,
        deleted_at: null,
      },
    });
  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_section_files.delete({
    where: {
      id: props.fileId,
    },
  });
  // Log the deletion action for audit trail
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.admin.id,
      actor_type: "admin",
      action_type: "FILE_DELETION",
      description: `Admin ${props.admin.id} deleted file ${props.fileId} from section ${props.sectionId}`,
      success: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}
