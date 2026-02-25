import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdministratorsAdministratorId(props: {
  superAdmin: SuperAdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the target administrator and verify existence
  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        id: props.administratorId,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!administrator) {
    throw new HttpException("Administrator not found or already deleted", 404);
  }
  // Verify the requesting user is authoritative super admin
  const requestingAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        super_admin_id: props.superAdmin.id,
        grade: "super",
        is_active: true,
        deleted_at: null,
      },
    });
  if (!requestingAdmin) {
    throw new HttpException(
      "Unauthorized: Requesting user is not a valid super administrator",
      403,
    );
  }
  // Prevent deleting the last super administrator
  if (administrator.grade === "super") {
    const remainingSuperAdmins =
      await MyGlobal.prisma.discussion_board_administrators.count({
        where: {
          grade: "super",
          is_active: true,
          deleted_at: null,
          id: { not: props.administratorId },
        },
      });
    if (remainingSuperAdmins === 0) {
      throw new HttpException(
        "Cannot delete the last super administrator - system requires at least one super admin",
        400,
      );
    }
  }
  // Perform deletion in transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Soft delete the administrators record
    await prisma.discussion_board_administrators.update({
      where: { id: props.administratorId },
      data: {
        is_active: false,
        deleted_at: toISOStringSafe(new Date()),
      },
    });
    // Delete corresponding auth record based on grade
    if (administrator.grade === "regular" && administrator.admin_id) {
      await prisma.discussion_board_admins.delete({
        where: { id: administrator.admin_id },
      });
    } else if (
      administrator.grade === "super" &&
      administrator.super_admin_id
    ) {
      await prisma.discussion_board_super_admins.delete({
        where: { id: administrator.super_admin_id },
      });
    } else {
      // Log warning if no corresponding auth record found
      console.warn(
        `No corresponding auth record found for administrator ${props.administratorId} with grade ${administrator.grade}`,
      );
    }
  });
  // Return void as specified in the specification
}
