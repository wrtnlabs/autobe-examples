import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminGuests(props: {
  admin: AdminPayload;
  body: ITodoAppGuest.IRequest;
}): Promise<IPageITodoAppGuest.ISummary> {
  const { admin, body } = props;

  // Authorization: ensure admin exists
  await MyGlobal.prisma.todo_app_admin.findUniqueOrThrow({
    where: { id: admin.id },
  });

  // Rate limiting: allow up to 10 searches per minute per admin
  const oneMinuteAgo = toISOStringSafe(new Date(Date.now() - 60_000));
  const recentSearchCount = await MyGlobal.prisma.todo_app_audit_records.count({
    where: {
      admin_id: admin.id,
      action_type: "search_guests",
      created_at: { gte: oneMinuteAgo },
    },
  });

  const RATE_LIMIT_PER_MINUTE = 10;
  if (recentSearchCount >= RATE_LIMIT_PER_MINUTE) {
    throw new HttpException("Too Many Requests", 429);
  }

  // Pagination defaults and caps
  const page = Number(body.page ?? 1);
  const pageSizeRequested = Number(body.pageSize ?? 20);
  const MAX_PAGE_SIZE = 1000;
  const limit =
    pageSizeRequested > 0 ? Math.min(pageSizeRequested, MAX_PAGE_SIZE) : 20;
  const skip = (page - 1) * limit;

  // Build where condition inline following null/undefined rules
  const where = {
    ...(body.email !== undefined &&
      body.email !== null && { email: body.email }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: toISOStringSafe(body.created_at_from as any),
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: toISOStringSafe(body.created_at_to as any),
              }),
          },
        }
      : {}),
    ...((body.last_active_at_from !== undefined &&
      body.last_active_at_from !== null) ||
    (body.last_active_at_to !== undefined && body.last_active_at_to !== null)
      ? {
          last_active_at: {
            ...(body.last_active_at_from !== undefined &&
              body.last_active_at_from !== null && {
                gte: toISOStringSafe(body.last_active_at_from as any),
              }),
            ...(body.last_active_at_to !== undefined &&
              body.last_active_at_to !== null && {
                lte: toISOStringSafe(body.last_active_at_to as any),
              }),
          },
        }
      : {}),
  };

  // Sorting
  const sortField =
    body.sortBy === "last_active_at" ? "last_active_at" : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Query database: results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_guest.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        last_active_at: true,
        status: true,
      },
    }),
    MyGlobal.prisma.todo_app_guest.count({ where }),
  ]);

  // Map rows to DTO summaries
  const data = rows.map((r) => ({
    id: r.id,
    email: r.email ?? null,
    created_at: toISOStringSafe(r.created_at as any),
    last_active_at: r.last_active_at
      ? toISOStringSafe(r.last_active_at as any)
      : null,
    status: r.status ?? null,
  }));

  // Audit logging for the search action
  try {
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4(),
        admin_id: admin.id,
        user_id: null,
        actor_role: "admin",
        action_type: "search_guests",
        target_resource: "todo_app_guest",
        target_id: null,
        reason: null,
        created_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err) {
    // Non-fatal: Do not break the main response for audit failures
    // Log via MyGlobal if available
    if (MyGlobal && typeof (MyGlobal as any).logger?.error === "function") {
      try {
        (MyGlobal as any).logger.error(
          "Failed to create audit record for guest search",
          err,
        );
      } catch {}
    }
  }

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(Math.ceil(total / limit)),
  };

  return { pagination, data };
}
