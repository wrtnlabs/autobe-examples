import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionAdministratorTransformer } from "../transformers/DiscussionBoardSectionAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionIdAssignmentsAssignmentId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdministrator.IUpdate;
}): Promise<IDiscussionBoardSectionAdministrator> {
  // Validate section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId, deleted_at: null },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Validate assignment exists and is not soft-deleted
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUnique({
      where: { id: props.assignmentId, deleted_at: null },
    });
  if (!existingAssignment) {
    throw new HttpException("Assignment not found", 404);
  }
  // Verify assignment belongs to the specified section
  if (existingAssignment.discussion_board_section_id !== props.sectionId) {
    throw new HttpException(
      "Assignment does not belong to the specified section",
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_section_administratorsUpdateInput =
    {
      permission_level: props.body.permission_level,
      updated_at: toISOStringSafe(new Date()),
    };
  // Handle admin/super admin reference updates with proper mutual exclusion
  if (
    props.body.discussion_board_admin_id !== undefined ||
    props.body.discussion_board_super_admin_id !== undefined
  ) {
    // Clear both references first to ensure mutual exclusion
    updateData.admin = { disconnect: true };
    updateData.superAdmin = { disconnect: true };
    // Set the appropriate reference based on what's provided
    if (
      props.body.discussion_board_admin_id !== undefined &&
      props.body.discussion_board_admin_id !== null
    ) {
      // Validate admin exists
      const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.discussion_board_admin_id, deleted_at: null },
      });
      if (!admin) {
        throw new HttpException("Admin not found", 404);
      }
      updateData.admin = {
        connect: { id: props.body.discussion_board_admin_id },
      };
    }
    if (
      props.body.discussion_board_super_admin_id !== undefined &&
      props.body.discussion_board_super_admin_id !== null
    ) {
      // Validate super admin exists
      const superAdmin =
        await MyGlobal.prisma.discussion_board_super_admins.findUnique({
          where: {
            id: props.body.discussion_board_super_admin_id,
            deleted_at: null,
          },
        });
      if (!superAdmin) {
        throw new HttpException("Super admin not found", 404);
      }
      updateData.superAdmin = {
        connect: { id: props.body.discussion_board_super_admin_id },
      };
    }
  }
  // Update the assignment
  const updatedAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.update({
      where: { id: props.assignmentId },
      data: updateData,
      ...DiscussionBoardSectionAdministratorTransformer.select(),
    });
  return await DiscussionBoardSectionAdministratorTransformer.transform(
    updatedAssignment,
  );
}
