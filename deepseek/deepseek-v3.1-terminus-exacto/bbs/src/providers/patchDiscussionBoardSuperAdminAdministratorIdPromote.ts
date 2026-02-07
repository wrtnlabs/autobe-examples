import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorIdPromote(props: {
  superAdmin: SuperadminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // Check if target administrator is the same as requesting super admin (self-demotion prevention)
  if (props.superAdmin.id === props.administratorId) {
    throw new HttpException("Cannot promote or demote yourself", 400);
  }
  // Verify target administrator exists and is currently a regular admin
  const existingAdministrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        id: props.administratorId,
        is_active: true,
        deleted_at: null,
      },
      include: {
        admin: true,
        superAdmin: true,
      },
    });
  if (!existingAdministrator) {
    throw new HttpException("Administrator not found", 404);
  }
  if (existingAdministrator.grade !== "regular") {
    throw new HttpException(
      "Target administrator is not a regular administrator",
      400,
    );
  }
  if (!existingAdministrator.admin_id) {
    throw new HttpException(
      "Target administrator does not have valid admin credentials",
      400,
    );
  }
  // Verify the requesting super admin exists (authorization verification)
  const requestingSuperAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        id: props.superAdmin.id,
        deleted_at: null,
      },
    });
  if (!requestingSuperAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  const now = toISOStringSafe(new Date());
  // Execute promotion as a transaction to ensure data consistency
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update the administrator's grade to "super"
    const updatedAdministrator =
      await prisma.discussion_board_administrators.update({
        where: { id: props.administratorId },
        data: {
          grade: "super",
          grade_changed_at: now,
          updated_at: now,
          // Update references: move from admin_id to super_admin_id
          super_admin_id: existingAdministrator.admin_id,
          admin_id: null,
        },
      });
    // Create grade change audit record
    await prisma.discussion_board_administrator_grade_changes.create({
      data: {
        id: v4(),
        administrator_id: props.administratorId,
        old_grade: "regular",
        new_grade: "super",
        reason: "Promoted to super administrator",
        changed_by_administrator_id: props.superAdmin.id,
        created_at: now,
      },
    });
    // Fetch the complete updated administrator record with relationships
    const completeAdministrator =
      await prisma.discussion_board_administrators.findUnique({
        where: { id: props.administratorId },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      });
    if (!completeAdministrator) {
      throw new HttpException(
        "Failed to retrieve updated administrator record",
        500,
      );
    }
    return completeAdministrator;
  });
  // Transform the database result to the API response DTO
  return DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    result,
  );
}
