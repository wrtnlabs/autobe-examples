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

export async function deleteDiscussionBoardAdminSectionsSectionIdAdministratorsAssignmentId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify the section exists and is not deleted
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // 2. Verify the assignment exists, belongs to the specified section, and is not deleted
  const assignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUnique({
      where: {
        id: props.assignmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_section_id: true,
        admin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        superAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
      },
    });
  if (!assignment) {
    throw new HttpException("Administrator assignment not found", 404);
  }
  if (assignment.discussion_board_section_id !== props.sectionId) {
    throw new HttpException(
      "Assignment does not belong to the specified section",
      400,
    );
  }
  // 3. Permission check - verify requesting admin can manage assignments in this section
  // Check if admin is assigned to this section with appropriate permission
  const adminAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        deleted_at: null,
        discussion_board_section_id: props.sectionId,
        OR: [
          { admin: { id: props.admin.id } }, // Regular admin assignment
          { superAdmin: { id: props.admin.id } }, // Super admin assignment
        ],
      },
      select: {
        id: true,
        permission_level: true,
        admin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        superAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
      },
    });
  if (!adminAssignment) {
    throw new HttpException(
      "You do not have permission to manage assignments for this section",
      403,
    );
  }
  // Additional check: Admin cannot remove their own assignment if they are the only admin for this section
  // (Optional business rule - leaving as comment for consideration)
  // const remainingAssignments = await MyGlobal.prisma.discussion_board_section_administrators.count({
  //   where: {
  //     deleted_at: null,
  //     discussion_board_section_id: props.sectionId,
  //     NOT: { id: props.assignmentId },
  //   },
  // });
  // if (remainingAssignments === 0) {
  //   throw new HttpException("Cannot remove the last administrator assignment from a section", 400);
  // }
  // 4. Soft delete the assignment (set deleted_at timestamp)
  await MyGlobal.prisma.discussion_board_section_administrators.update({
    where: { id: props.assignmentId },
    data: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
