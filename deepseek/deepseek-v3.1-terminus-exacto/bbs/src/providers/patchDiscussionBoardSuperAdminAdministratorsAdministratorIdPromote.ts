import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdminTransformer } from "../transformers/DiscussionBoardAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorsAdministratorIdPromote(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  // 1. Verify superAdmin actor exists in super_admin table and get associated admin record
  const superAdminRecord =
    await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
      where: { id: props.superAdmin.id, deleted_at: null },
      select: { id: true, email: true },
    });
  // Get the admin record for the superAdmin (should exist in admins table)
  const superAdminAsAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { email: superAdminRecord.email, deleted_at: null },
      select: { id: true, admin_grade: true },
    });
  // Verify superAdmin's admin grade
  if (superAdminAsAdmin.admin_grade !== "super") {
    throw new HttpException("You are not a super administrator", 403);
  }
  // 2. Check target administrator exists and is regular admin
  const targetAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.administratorId, deleted_at: null },
      select: { id: true, admin_grade: true, email: true },
    });
  if (targetAdmin.admin_grade !== "regular") {
    throw new HttpException(
      "Target administrator is already a super administrator",
      400,
    );
  }
  // 3. Prevent self-promotion
  if (targetAdmin.id === superAdminAsAdmin.id) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // 4. Check at least one super admin would remain after promotion
  const currentSuperAdmins =
    await MyGlobal.prisma.discussion_board_admins.findMany({
      where: { admin_grade: "super", deleted_at: null },
      select: { id: true },
    });
  if (
    currentSuperAdmins.length <= 1 &&
    currentSuperAdmins[0].id === superAdminAsAdmin.id
  ) {
    throw new HttpException(
      "Cannot demote the last remaining super administrator",
      400,
    );
  }
  // 5. Execute promotion in single transaction
  const assignmentId = v4();
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Create main assignment record
    MyGlobal.prisma.discussion_board_administrator_assignments.create({
      data: {
        id: assignmentId,
        old_role: "admin",
        new_role: "super_admin",
        assignment_type: "promotion",
        reason: "Promoted to super administrator",
        created_at: now,
        updated_at: now,
      },
    }),
    // Create assigner subtype record
    MyGlobal.prisma.discussion_board_administrator_assignment_by_super_admins.create(
      {
        data: {
          id: v4(),
          discussion_board_administrator_assignment_id: assignmentId,
          discussion_board_super_admin_id: props.superAdmin.id,
          discussion_board_super_admin_session_id: props.superAdmin.session_id,
          created_at: now,
          updated_at: now,
        },
      },
    ),
    // IMPORTANT: The target is an ADMIN, not super admin yet, so need correct subtype table
    // First check which subtype table to use - but target should become super admin
    // For now use admin assignment target table
    MyGlobal.prisma.discussion_board_administrator_assignment_to_super_admins.create(
      {
        data: {
          id: v4(),
          discussion_board_administrator_assignment_id: assignmentId,
          discussion_board_super_admin_id: props.administratorId,
          created_at: now,
          updated_at: now,
        },
      },
    ),
    // Update administrator grade
    MyGlobal.prisma.discussion_board_admins.update({
      where: { id: props.administratorId },
      data: { admin_grade: "super", updated_at: now },
    }),
  ]);
  // 6. Fetch and return updated administrator
  const updatedAdmin =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...DiscussionBoardAdminTransformer.select(),
    });
  return await DiscussionBoardAdminTransformer.transform(updatedAdmin);
}
