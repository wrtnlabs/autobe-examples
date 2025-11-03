import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminAction";
import { IPageITodoAppAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdminActions(props: {
  admin: AdminPayload;
  body: ITodoAppAdminAction.IRequest;
}): Promise<IPageITodoAppAdminAction.ISummary> {
  const { admin, body } = props;

  const actor = await MyGlobal.prisma.todo_app_admin.findUniqueOrThrow({
    where: { id: admin.id },
    select: { id: true, role: true, is_active: true, deleted_at: true },
  });

  if (body.includeDeleted && actor.role !== "superadmin")
    throw new HttpException(
      "Unauthorized: insufficient privileges to include deleted records",
      403,
    );

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  const order = (body.order === "desc" ? "desc" : "asc") as "asc" | "desc";

  const hasCreatedFilters =
    (body.createdAfter !== undefined && body.createdAfter !== null) ||
    (body.createdBefore !== undefined && body.createdBefore !== null);

  const createdFilter = hasCreatedFilters
    ? {
        created_at: {
          ...(body.createdAfter !== undefined &&
            body.createdAfter !== null && { gte: body.createdAfter }),
          ...(body.createdBefore !== undefined &&
            body.createdBefore !== null && { lte: body.createdBefore }),
        },
      }
    : {};

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_admin_actions.findMany({
      where: {
        ...(body.action !== undefined &&
          body.action !== null && { action: body.action }),
        ...(body.auditCaseId !== undefined &&
          body.auditCaseId !== null && { audit_case_id: body.auditCaseId }),
        ...(body.affectedUserId !== undefined &&
          body.affectedUserId !== null && {
            todo_app_todouser_id: body.affectedUserId,
          }),
        ...(body.adminId !== undefined &&
          body.adminId !== null && { todo_app_admin_id: body.adminId }),
        ...(body.includeDeleted ? {} : { deleted_at: null }),
        ...createdFilter,
      },
      select: {
        id: true,
        action: true,
        reason: true,
        target_type: true,
        target_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: {
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
        },
        affectedUser: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy:
        body.sortBy === "action" ? { action: order } : { created_at: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_admin_actions.count({
      where: {
        ...(body.action !== undefined &&
          body.action !== null && { action: body.action }),
        ...(body.auditCaseId !== undefined &&
          body.auditCaseId !== null && { audit_case_id: body.auditCaseId }),
        ...(body.affectedUserId !== undefined &&
          body.affectedUserId !== null && {
            todo_app_todouser_id: body.affectedUserId,
          }),
        ...(body.adminId !== undefined &&
          body.adminId !== null && { todo_app_admin_id: body.adminId }),
        ...(body.includeDeleted ? {} : { deleted_at: null }),
        ...createdFilter,
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    action: r.action,
    reason: r.reason ?? null,
    targetType: r.target_type ?? null,
    targetId: r.target_id ?? null,
    admin: {
      id: r.admin.id,
      email: r.admin.email,
      displayName: r.admin.display_name ?? null,
      role: r.admin.role as "moderator" | "support" | "superadmin",
      isActive: r.admin.is_active,
      createdAt: toISOStringSafe(r.admin.created_at),
      updatedAt: toISOStringSafe(r.admin.updated_at),
      deletedAt: r.admin.deleted_at
        ? toISOStringSafe(r.admin.deleted_at)
        : null,
    },
    affectedUser: r.affectedUser
      ? {
          id: r.affectedUser.id,
          displayName: r.affectedUser.display_name ?? null,
          isVerified: r.affectedUser.is_verified,
          status: r.affectedUser.status ?? undefined,
          createdAt: toISOStringSafe(r.affectedUser.created_at),
          updatedAt: toISOStringSafe(r.affectedUser.updated_at),
        }
      : undefined,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
    deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
