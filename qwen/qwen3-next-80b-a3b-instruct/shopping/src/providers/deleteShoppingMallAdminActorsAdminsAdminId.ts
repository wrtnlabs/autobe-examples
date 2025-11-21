import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminActorsAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Prevent admin from deleting themselves
  if (props.admin.id === props.adminId) {
    throw new HttpException("Cannot delete own admin account", 403);
  }

  // Ensure admin record exists and is active before deletion
  const adminExists = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });

  if (!adminExists) {
    throw new HttpException("Admin not found", 404);
  }

  // Delete the admin record (hard delete)
  await MyGlobal.prisma.shopping_mall_admins.delete({
    where: {
      id: props.adminId,
    },
  });

  // Delete associated sessions
  await MyGlobal.prisma.shopping_mall_admin_sessions.deleteMany({
    where: {
      shopping_mall_admin_id: props.adminId,
    },
  });

  // Log deletion in audit trail - use toISOStringSafe for datetime
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: props.admin.id satisfies string as string,
      actor_type: "admin",
      event_type: "admin_delete",
      event_details: `Admin ${props.admin.id} deleted admin ${props.adminId}`,
      status: "success",
      source: "admin_dashboard",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
