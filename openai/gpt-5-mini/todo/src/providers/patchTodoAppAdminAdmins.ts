import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.IRequest;
}): Promise<IPageITodoAppAdmin.ISummary> {
  const { admin, body } = props;

  // Authorization: ensure the caller exists, is active, and not soft-deleted
  const caller = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (!caller || caller.deleted_at !== null || caller.is_active !== true) {
    throw new HttpException("Unauthorized", 403);
  }

  // Pagination defaults and validation
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? 20);

  if (!Number.isInteger(page) || page < 1) {
    throw new HttpException("Bad Request: invalid page", 400);
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new HttpException("Bad Request: invalid pageSize", 400);
  }

  // Sorting validation
  const sortBy = body.sortBy ?? "createdAt";
  if (sortBy !== "createdAt" && sortBy !== "displayName") {
    throw new HttpException("Bad Request: invalid sortBy", 400);
  }
  const order = body.order === "desc" ? "desc" : "asc";

  // Build where conditions inline (schema-checked fields only)
  const where: Record<string, unknown> = {};
  if (!body.auditMode) {
    where.deleted_at = null;
  }
  if (body.role !== undefined) where.role = body.role;
  if (body.isActive !== undefined) where.is_active = body.isActive;
  if (body.q !== undefined && body.q !== null) {
    where.OR = [
      { email: { contains: body.q } },
      { display_name: { contains: body.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_admin.findMany({
      where,
      orderBy:
        sortBy === "displayName"
          ? { display_name: order }
          : { created_at: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
    MyGlobal.prisma.todo_app_admin.count({ where }),
  ]);

  const data = rows.map((r) => {
    const summary: any = {
      id: r.id,
      email: r.email,
      // displayName is optional+nullable in DTO; use undefined when DB null
      displayName: r.display_name === null ? undefined : r.display_name,
      role: r.role,
      isActive: r.is_active,
      createdAt: toISOStringSafe(r.created_at),
    };

    // updated_at exists; include if present
    summary.updatedAt = r.updated_at
      ? toISOStringSafe(r.updated_at)
      : undefined;

    // Only include deletedAt when auditMode is requested
    if (body.auditMode) {
      summary.deletedAt = r.deleted_at ? toISOStringSafe(r.deleted_at) : null;
    }

    return summary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(Math.ceil(total / pageSize)),
    },
    data,
  };
}
