import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminAction";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdminActionsAdminActionId(props: {
  admin: AdminPayload;
  adminActionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdminAction> {
  const { admin, adminActionId } = props;

  // Fetch the admin action with related entities
  const action = await MyGlobal.prisma.todo_app_admin_actions.findUnique({
    where: { id: adminActionId },
    include: {
      admin: true,
      adminSession: { include: { admin: true } },
      affectedUser: true,
    },
  });

  if (!action) {
    throw new HttpException("Not Found", 404);
  }

  // Load requesting admin to perform authorization checks
  const requester = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });

  if (!requester || !requester.is_active || requester.deleted_at !== null) {
    throw new HttpException("Unauthorized", 403);
  }

  // Only the actor or a superadmin may view the record
  if (
    requester.role !== "superadmin" &&
    action.todo_app_admin_id !== admin.id
  ) {
    throw new HttpException("Forbidden: insufficient permissions", 403);
  }

  // Map admin summary
  const adminSummary = {
    id: action.admin.id,
    email: action.admin.email,
    displayName: action.admin.display_name ?? null,
    role: typia.assert<"moderator" | "support" | "superadmin">(
      action.admin.role,
    ),
    isActive: action.admin.is_active,
    createdAt: toISOStringSafe(action.admin.created_at),
    updatedAt: action.admin.updated_at
      ? toISOStringSafe(action.admin.updated_at)
      : null,
    deletedAt: action.admin.deleted_at
      ? toISOStringSafe(action.admin.deleted_at)
      : null,
  } satisfies ITodoAppAdmin.ISummary;

  // Map adminSession summary when present
  const adminSessionSummary = action.adminSession
    ? ({
        id: action.adminSession.id,
        admin: adminSummary,
        ip: action.adminSession.ip,
        href: action.adminSession.href,
        referrer: action.adminSession.referrer,
        createdAt: toISOStringSafe(action.adminSession.created_at),
        // Ensure expiredAt is always a date-time string (fallback to created_at)
        expiredAt: toISOStringSafe(
          action.adminSession.expired_at ?? action.adminSession.created_at,
        ),
      } satisfies ITodoAppAdminSession.ISummary)
    : undefined;

  // Map affectedUser when present
  const affectedUserSummary = action.affectedUser
    ? ({
        id: action.affectedUser.id,
        displayName: action.affectedUser.display_name ?? null,
        isVerified: action.affectedUser.is_verified,
        status: action.affectedUser.status ?? undefined,
        createdAt: toISOStringSafe(action.affectedUser.created_at),
        // Ensure updatedAt is always a date-time string (fallback to created_at)
        updatedAt: toISOStringSafe(
          action.affectedUser.updated_at ?? action.affectedUser.created_at,
        ),
      } satisfies ITodoAppTodoUser.ISummary)
    : undefined;

  // Build and return the DTO
  return {
    id: action.id,
    admin: adminSummary,
    adminSession: adminSessionSummary ?? null,
    affectedUser: affectedUserSummary ?? null,
    action: action.action,
    reason: action.reason ?? null,
    targetType: action.target_type ?? null,
    targetId: action.target_id ?? null,
    details: action.details ?? null,
    auditCaseId: action.audit_case_id ?? null,
    createdAt: toISOStringSafe(action.created_at),
    updatedAt: action.updated_at ? toISOStringSafe(action.updated_at) : null,
    deletedAt: action.deleted_at ? toISOStringSafe(action.deleted_at) : null,
  } as ITodoAppAdminAction;
}
