import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorGradeChangeCollector } from "../collectors/DiscussionBoardAdministratorGradeChangeCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminAdministratorsAdministratorIdDemote(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorGradeChange.ICreate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Self-demotion prevention
  if (props.superAdmin.id === props.administratorId) {
    throw new HttpException(
      "Super administrators cannot demote themselves",
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify target administrator exists and is currently super admin
    const targetAdministrator =
      await tx.discussion_board_administrators.findUniqueOrThrow({
        where: {
          id: props.administratorId,
          grade: "super",
          deleted_at: null,
        },
      });
    // Create regular admin record for demoted admin
    const regularAdmin = await tx.discussion_board_admins.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: "placeholder@example.com",
        password_hash: "placeholder_hash",
        display_name: "Demoted Administrator",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
    // Update administrator table for grade change
    await tx.discussion_board_administrators.update({
      where: { id: targetAdministrator.id },
      data: {
        admin_id: regularAdmin.id,
        super_admin_id: null,
        grade: "regular",
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Find section assignments for this administrator using relationship field
    const sectionAssignments =
      await tx.discussion_board_section_administrators.findMany({
        where: {
          superAdmin: { id: props.administratorId },
          deleted_at: null,
        },
      });
    // Update any existing section assignments using relationship fields
    if (sectionAssignments.length > 0) {
      await Promise.all(
        sectionAssignments.map((assignment) =>
          tx.discussion_board_section_administrators.update({
            where: { id: assignment.id },
            data: {
              superAdmin: { disconnect: true },
              admin: { connect: { id: regularAdmin.id } },
              updated_at: toISOStringSafe(new Date()),
            },
          }),
        ),
      );
    }
    // Create grade change audit using collector
    await DiscussionBoardAdministratorGradeChangeCollector.collect({
      body: props.body,
      discussionBoardAdmins: { id: regularAdmin.id },
      changedByAdministrator: { id: props.superAdmin.id },
    });
    // Return updated section assignment or create a minimal one
    if (sectionAssignments.length > 0) {
      const result =
        await tx.discussion_board_section_administrators.findUniqueOrThrow({
          where: { id: sectionAssignments[0].id },
          ...DiscussionBoardSuperAdminTransformer.select(),
        });
      return DiscussionBoardSuperAdminTransformer.transform(result);
    }
    // Create minimal assignment for response if none exists
    const minimalSection = await tx.discussion_board_sections.findFirst({
      where: { deleted_at: null },
    });
    if (!minimalSection) {
      throw new HttpException("No sections available for assignment", 404);
    }
    const newAssignment =
      await tx.discussion_board_section_administrators.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          admin: { connect: { id: regularAdmin.id } },
          superAdmin: undefined,
          section: { connect: { id: minimalSection.id } },
          permission_level: "read",
          assignment_date: toISOStringSafe(new Date()),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
        ...DiscussionBoardSuperAdminTransformer.select(),
      });
    return DiscussionBoardSuperAdminTransformer.transform(newAssignment);
  });
}
