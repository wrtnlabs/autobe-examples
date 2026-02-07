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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAdministratorTransformer } from "../transformers/DiscussionBoardSectionAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSectionsSectionIdAssignmentsAssignmentId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdministrator.IUpdate;
}): Promise<IDiscussionBoardSectionAdministrator> {
  // Verify section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) throw new HttpException("Section not found", 404);
  // Verify assignment exists and belongs to the specified section
  const assignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findUnique({
      where: {
        id: props.assignmentId,
        discussion_board_section_id: props.sectionId,
      },
      ...DiscussionBoardSectionAdministratorTransformer.select(),
    });
  if (!assignment)
    throw new HttpException("Assignment not found for this section", 404);
  // Validate that only one admin type is assigned
  if (
    props.body.discussion_board_admin_id &&
    props.body.discussion_board_super_admin_id
  ) {
    throw new HttpException(
      "Cannot assign both regular and super administrator to the same assignment",
      400,
    );
  }
  // Validate permission level is not empty
  if (!props.body.permission_level.trim()) {
    throw new HttpException("Permission level cannot be empty", 400);
  }
  // Build update data
  const updateData: Prisma.discussion_board_section_administratorsUpdateInput =
    {
      permission_level: props.body.permission_level,
      updated_at: toISOStringSafe(new Date()),
    };
  // Handle admin assignment changes
  if (props.body.discussion_board_admin_id !== undefined) {
    if (props.body.discussion_board_admin_id === null) {
      updateData.admin = { disconnect: true };
    } else {
      // Verify regular admin exists
      const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.discussion_board_admin_id },
      });
      if (!admin)
        throw new HttpException("Regular administrator not found", 404);
      updateData.admin = {
        connect: { id: props.body.discussion_board_admin_id },
      };
    }
  }
  if (props.body.discussion_board_super_admin_id !== undefined) {
    if (props.body.discussion_board_super_admin_id === null) {
      updateData.superAdmin = { disconnect: true };
    } else {
      // Verify super admin exists
      const superAdmin =
        await MyGlobal.prisma.discussion_board_super_admins.findUnique({
          where: { id: props.body.discussion_board_super_admin_id },
        });
      if (!superAdmin)
        throw new HttpException("Super administrator not found", 404);
      updateData.superAdmin = {
        connect: { id: props.body.discussion_board_super_admin_id },
      };
    }
  }
  try {
    // Perform update
    const updated =
      await MyGlobal.prisma.discussion_board_section_administrators.update({
        where: { id: props.assignmentId },
        data: updateData,
        ...DiscussionBoardSectionAdministratorTransformer.select(),
      });
    return await DiscussionBoardSectionAdministratorTransformer.transform(
      updated,
    );
  } catch (error) {
    // Handle unique constraint violations
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "An administrator is already assigned to this section",
        409,
      );
    }
    throw error;
  }
}
