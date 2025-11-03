import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Deny self-deletion
  if (props.admin.id === props.adminId) {
    throw new HttpException(
      "Self-deletion of admin account is prohibited.",
      403,
    );
  }

  // 2. Get performing admin actor (caller) and check role/status
  const actor = await MyGlobal.prisma.shopping_admins.findFirst({
    where: {
      id: props.admin.id,
      status: "active",
      deleted_at: null,
    },
  });
  if (!actor) {
    throw new HttpException("Performing admin not found or not active.", 403);
  }
  if (actor.role !== "super") {
    throw new HttpException(
      "Only super-admins may permanently delete administrators.",
      403,
    );
  }

  // 3. Get target admin to delete
  const target = await MyGlobal.prisma.shopping_admins.findFirst({
    where: {
      id: props.adminId,
    },
  });
  if (!target) {
    throw new HttpException("Target admin not found.", 404);
  }

  // 4. Check: Cannot delete last remaining active admin
  const activeAdminCount = await MyGlobal.prisma.shopping_admins.count({
    where: {
      status: "active",
      deleted_at: null,
    },
  });
  if (activeAdminCount <= 1) {
    throw new HttpException("Cannot delete last remaining admin account.", 403);
  }

  // 5. Fully delete all admin sessions for the target admin
  await MyGlobal.prisma.shopping_admin_sessions.deleteMany({
    where: {
      shopping_admin_id: props.adminId,
    },
  });

  // 6. Hard delete the admin account
  await MyGlobal.prisma.shopping_admins.delete({
    where: { id: props.adminId },
  });

  // 7. Write audit log of the deletion event
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      category: "admin",
      event_type: "ADMIN_HARD_DELETE",
      description: `Hard-deleted adminId=${props.adminId}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
