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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteDiscussionBoardSuperAdminSectionsSectionIdAssignmentsAssignmentId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found or has been deleted", 404);
  }
  // Verify assignment exists, belongs to the section, and is active
  const assignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUnique({
      where: {
        id: props.assignmentId,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new HttpException("Assignment not found or has been deleted", 404);
  }
  if (assignment.discussion_board_section_id !== props.sectionId) {
    throw new HttpException(
      "Assignment does not belong to the specified section",
      400,
    );
  }
  const currentTime = toISOStringSafe(new Date());
  // Perform soft deletion
  await MyGlobal.prisma.discussion_board_section_administrators.update({
    where: { id: props.assignmentId },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });
  // Log the assignment removal for audit purposes
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.superAdmin.id,
      actor_type: "super_admin",
      action_type: "ASSIGNMENT_REMOVED",
      target_section_id: props.sectionId,
      target_admin_id: assignment.discussion_board_admin_id,
      description: `Assignment removed from section ${props.sectionId} by super admin`,
      success: true,
      created_at: currentTime,
      updated_at: currentTime,
    },
  });
}
