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

export async function deleteDiscussionBoardAdminSectionsSectionIdAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get current timestamp as ISO string using Date object
  const currentTime = toISOStringSafe(new Date());
  // Validate section existence and active status
  const sectionCount = await MyGlobal.prisma.discussion_board_sections.count({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (sectionCount === 0) {
    throw new HttpException(
      "Discussion board section not found or has been deleted",
      404,
    );
  }
  // Validate assignment existence and ownership
  const assignmentCount =
    await MyGlobal.prisma.discussion_board_section_administrators.count({
      where: {
        id: props.assignmentId,
        discussion_board_section_id: props.sectionId,
        deleted_at: null,
      },
    });
  if (assignmentCount === 0) {
    throw new HttpException(
      "Administrator assignment not found or has been deleted",
      404,
    );
  }
  // Check if requesting admin has super admin privileges
  const isSuperAdmin =
    (await MyGlobal.prisma.discussion_board_super_admins.count({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    })) > 0;
  // For regular administrators, check section assignment permissions
  if (!isSuperAdmin) {
    const hasPermission =
      (await MyGlobal.prisma.discussion_board_section_administrators.count({
        where: {
          discussion_board_admin_id: props.admin.id,
          discussion_board_section_id: props.sectionId,
          deleted_at: null,
          permission_level: {
            in: ["full", "manage_assignments"],
          },
        },
      })) > 0;
    if (!hasPermission) {
      throw new HttpException(
        "Insufficient permissions: You do not have assignment management rights for this section",
        403,
      );
    }
  }
  // Perform soft deletion
  await MyGlobal.prisma.discussion_board_section_administrators.update({
    where: { id: props.assignmentId },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });
}
