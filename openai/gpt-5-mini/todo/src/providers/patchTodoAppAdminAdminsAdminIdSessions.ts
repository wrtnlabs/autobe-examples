import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { IPageITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoAppAdminSession.IRequest;
}): Promise<IPageITodoAppAdminSession.ISummary> {
  const { admin, adminId, body } = props;

  if (!admin) throw new HttpException("Unauthorized", 401);

  const targetAdmin = await MyGlobal.prisma.todo_app_admin.findUnique({
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

  if (!targetAdmin) throw new HttpException("Not Found", 404);

  const page = Number(body.page ?? 1);
  const pageSize = Math.min(Number(body.pageSize ?? 25), 200);
  if (page <= 0 || pageSize <= 0)
    throw new HttpException("Bad Request: invalid pagination", 400);
  const skip = (page - 1) * pageSize;

  const now = toISOStringSafe(new Date());

  const baseWhere = {
    todo_app_admin_id: adminId,
    ...(body.ip !== undefined && body.ip !== null && { ip: body.ip }),
    ...(body.href !== undefined &&
      body.href !== null && { href: { contains: body.href } }),
    ...(body.referrer !== undefined &&
      body.referrer !== null && { referrer: { contains: body.referrer } }),
    ...((body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
      ? {
          created_at: {
            ...(body.createdAtFrom !== undefined &&
              body.createdAtFrom !== null && { gte: body.createdAtFrom }),
            ...(body.createdAtTo !== undefined &&
              body.createdAtTo !== null && { lte: body.createdAtTo }),
          },
        }
      : {}),
  } as const;

  const status = body.status ?? "all";

  const whereForQueries =
    status === "active"
      ? {
          ...baseWhere,
          OR: [{ expired_at: null }, { expired_at: { gt: now } }],
        }
      : status === "expired"
        ? {
            ...baseWhere,
            expired_at: { lte: now },
          }
        : baseWhere;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_admin_sessions.findMany({
      where: whereForQueries,
      include: {
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
      },
      orderBy:
        body.sortBy === "expiredAt"
          ? { expired_at: body.order === "asc" ? "asc" : "desc" }
          : body.sortBy === "ip"
            ? { ip: body.order === "asc" ? "asc" : "desc" }
            : { created_at: body.order === "asc" ? "asc" : "desc" },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.todo_app_admin_sessions.count({ where: whereForQueries }),
  ]);

  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: admin.id,
      todo_app_admin_session_id: admin.session_id,
      event_type: "read_sessions",
      target_type: "admin",
      target_id: adminId,
      details: JSON.stringify({ filters: body }),
      ip: body.ip ?? null,
      href: body.href ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const data = rows.map((r) => {
    return {
      id: r.id as string & tags.Format<"uuid">,
      admin: {
        id: r.admin.id as string & tags.Format<"uuid">,
        email: r.admin.email,
        displayName: r.admin.display_name ?? null,
        role: r.admin.role,
        isActive: r.admin.is_active,
        createdAt: toISOStringSafe(r.admin.created_at),
        updatedAt: r.admin.updated_at
          ? toISOStringSafe(r.admin.updated_at)
          : null,
        deletedAt: r.admin.deleted_at
          ? toISOStringSafe(r.admin.deleted_at)
          : null,
      } as ITodoAppAdmin.ISummary,
      ip: r.ip,
      href: r.href,
      referrer: r.referrer,
      createdAt: toISOStringSafe(r.created_at),
      expiredAt: r.expired_at ? toISOStringSafe(r.expired_at) : null,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(pageSize)),
    },
    data,
  };
}
