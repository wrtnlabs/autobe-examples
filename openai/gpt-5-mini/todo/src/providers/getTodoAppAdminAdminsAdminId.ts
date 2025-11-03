import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminRole";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdmin> {
  const { admin, adminId } = props;

  // Authorization: verify the calling admin account exists and is active
  const actor = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (!actor || !actor.is_active || actor.deleted_at) {
    throw new HttpException("Unauthorized", 403);
  }

  // Retrieve target admin with non-sensitive fields only
  const target = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      display_name: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!target) {
    throw new HttpException("Not Found", 404);
  }

  // Prepare ISO timestamp once for audit record
  const now = toISOStringSafe(new Date());

  // Create audit log entry (inline data object)
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      event_type: "admin_retrieve",
      target_type: "admin",
      target_id: adminId,
      created_at: now,
      updated_at: now,
    },
  });

  // Map DB fields to API DTO, converting Date -> ISO strings
  return {
    id: target.id as string & tags.Format<"uuid">,
    email: target.email as string & tags.Format<"email">,
    display_name: target.display_name ?? null,
    role: target.role as ITodoAppAdminRole,
    is_active: target.is_active,
    createdAt: toISOStringSafe(target.created_at),
    updatedAt: toISOStringSafe(target.updated_at),
    deletedAt: target.deleted_at ? toISOStringSafe(target.deleted_at) : null,
  };
}
