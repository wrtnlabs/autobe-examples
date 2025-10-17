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

  // Confirm caller exists in DB (authorization check)
  const caller = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });
  if (!caller) throw new HttpException("Unauthorized", 403);

  // Pagination defaults and validation
  const page = Number(body.page ?? 1);
  if (!Number.isFinite(page) || page < 1)
    throw new HttpException("Bad Request: page must be >= 1", 400);

  const pageSize = Number(body.pageSize ?? 20);
  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 100)
    throw new HttpException(
      "Bad Request: pageSize must be between 1 and 100",
      400,
    );

  // Sorting validation
  const allowedSortBy = ["created_at", "last_active_at"] as const;
  const sort_by = body.sort_by ?? "created_at";
  if (!allowedSortBy.includes(sort_by as any))
    throw new HttpException("Bad Request: invalid sort_by", 400);
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Build where clause
  const where: Record<string, unknown> = {};
  if (body.email !== undefined && body.email !== null) {
    where.email = body.email;
  }
  if (body.emailLike !== undefined && body.emailLike !== null) {
    where.email = { contains: body.emailLike };
  }
  if (body.is_super !== undefined && body.is_super !== null) {
    where.is_super = body.is_super;
  }
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    const createdAt: Record<string, unknown> = {};
    if (body.created_from !== undefined && body.created_from !== null)
      createdAt.gte = toISOStringSafe(body.created_from);
    if (body.created_to !== undefined && body.created_to !== null)
      createdAt.lte = toISOStringSafe(body.created_to);
    where.created_at = createdAt;
  }

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_admin.findMany({
        where,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          is_super: true,
          created_at: true,
          last_active_at: true,
        },
      }),
      MyGlobal.prisma.todo_app_admin.count({ where }),
    ]);

    const data = rows.map((r) => {
      const item = {
        id: r.id,
        email: r.email,
        is_super: r.is_super,
        created_at: toISOStringSafe(r.created_at),
        last_active_at: r.last_active_at
          ? toISOStringSafe(r.last_active_at)
          : null,
      } satisfies ITodoAppAdmin.ISummary;
      return item;
    });

    const pagination = {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(total / pageSize),
    } satisfies IPage.IPagination;

    // Audit logging
    const auditId = v4() satisfies string & tags.Format<"uuid">;
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: auditId,
        admin_id: admin.id,
        user_id: null,
        actor_role: "admin",
        action_type: "list_admins",
        target_resource: "todo_app_admin",
        target_id: null,
        reason: body.emailLike ?? body.email ?? null,
        created_at: toISOStringSafe(new Date()),
      },
    });

    return {
      pagination,
      data,
    } satisfies IPageITodoAppAdmin.ISummary;
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
