import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoAppAdmin.IUpdate;
}): Promise<ITodoAppAdmin.ISummary> {
  const { admin, adminId, body } = props;

  // Business validation: at least one mutable field must be present
  if (
    body.email === undefined &&
    body.is_super === undefined &&
    body.last_active_at === undefined
  ) {
    throw new HttpException("Bad Request: no updatable fields provided", 400);
  }

  // Authorization for privileged change
  if (body.is_super !== undefined) {
    const caller = await MyGlobal.prisma.todo_app_admin.findUnique({
      where: { id: admin.id },
    });
    if (!caller) throw new HttpException("Unauthorized: caller not found", 401);
    if (caller.is_super !== true) {
      throw new HttpException(
        "Forbidden: only super-admin can modify is_super",
        403,
      );
    }
  }

  // Ensure the target admin exists
  const target = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: adminId },
  });
  if (!target) throw new HttpException("Not Found", 404);

  // Email uniqueness check
  if (body.email !== undefined) {
    const existing = await MyGlobal.prisma.todo_app_admin.findFirst({
      where: { email: body.email },
    });
    if (existing && existing.id !== adminId) {
      throw new HttpException("Conflict: email already in use", 409);
    }
  }

  // Perform update with inline data object
  const updated = await MyGlobal.prisma.todo_app_admin.update({
    where: { id: adminId },
    data: {
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.is_super !== undefined ? { is_super: body.is_super } : {}),
      ...(body.last_active_at !== undefined
        ? {
            last_active_at:
              body.last_active_at === null
                ? null
                : toISOStringSafe(body.last_active_at),
          }
        : {}),
    },
  });

  // Audit side-effect
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      user_id: null,
      actor_role: "admin",
      action_type: "update_admin",
      target_resource: "admin",
      target_id: adminId,
      reason: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    is_super: updated.is_super,
    created_at: toISOStringSafe(updated.created_at),
    last_active_at: updated.last_active_at
      ? toISOStringSafe(updated.last_active_at)
      : null,
  };
}
