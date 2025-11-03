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

export async function putTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoAppAdmin.IUpdate;
}): Promise<ITodoAppAdmin> {
  const { admin, adminId, body } = props;

  // Validate actor and fetch its latest record (to get role and active status)
  const actor = await MyGlobal.prisma.todo_app_admin.findUniqueOrThrow({
    where: { id: admin.id },
  });

  if (!actor.is_active || actor.deleted_at) {
    throw new HttpException("Unauthorized: inactive admin", 403);
  }

  const actorIsSuper = actor.role === "superadmin";

  // Ensure target admin exists and is not soft-deleted
  const target = await MyGlobal.prisma.todo_app_admin.findFirstOrThrow({
    where: { id: adminId, deleted_at: null },
  });

  // Authorization: only superadmin or self can update target
  if (!actorIsSuper && actor.id !== adminId) {
    throw new HttpException(
      "Unauthorized: only superadmin or the admin themselves can update this account",
      403,
    );
  }

  // Prevent non-superadmins from modifying a superadmin
  if (!actorIsSuper && target.role === "superadmin") {
    throw new HttpException(
      "Unauthorized: cannot modify a superadmin account",
      403,
    );
  }

  // Prepare timestamp for updates/audit
  const now = toISOStringSafe(new Date());

  // Update allowed fields (inline to preserve Prisma type error clarity)
  const updated = await MyGlobal.prisma.todo_app_admin.update({
    where: { id: adminId },
    data: {
      display_name:
        body.displayName === undefined
          ? undefined
          : body.displayName === null
            ? null
            : body.displayName,
      role: body.role ?? undefined,
      is_active: body.isActive ?? undefined,
      updated_at: now,
    },
  });

  // Create admin action audit record
  await MyGlobal.prisma.todo_app_admin_actions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      action: "update_admin",
      reason: null,
      target_type: "admin",
      target_id: adminId,
      details: JSON.stringify({
        before: {
          role: target.role,
          display_name: target.display_name,
          is_active: target.is_active,
        },
        after: {
          role: updated.role,
          display_name: updated.display_name,
          is_active: updated.is_active,
        },
      }),
      created_at: now,
      updated_at: now,
    },
  });

  // Create general audit log for system-wide traceability
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      event_type: "update_admin",
      target_type: "admin",
      target_id: adminId,
      details: JSON.stringify({
        before: {
          role: target.role,
          display_name: target.display_name,
          is_active: target.is_active,
        },
        after: {
          role: updated.role,
          display_name: updated.display_name,
          is_active: updated.is_active,
        },
      }),
      created_at: now,
      updated_at: now,
    },
  });

  // Map database record to API DTO, converting Date -> ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    display_name:
      updated.display_name === null
        ? null
        : (updated.display_name ?? undefined),
    role: updated.role as ITodoAppAdminRole,
    is_active: updated.is_active,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
