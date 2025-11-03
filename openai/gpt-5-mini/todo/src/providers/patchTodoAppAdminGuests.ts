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

  // Normalize pagination with safe defaults
  const page = Number(body.page ?? 1);
  const limit = Number(body.pageSize ?? 25);

  if (!Number.isFinite(page) || page < 1) {
    throw new HttpException("Bad Request: invalid page", 400);
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    throw new HttpException("Bad Request: invalid pageSize", 400);
  }

  // Validate anonymous label search length
  if (
    body.anonymousLabelSearch !== undefined &&
    body.anonymousLabelSearch !== null &&
    body.anonymousLabelSearch.length > 256
  ) {
    throw new HttpException("Bad Request: anonymousLabelSearch too long", 400);
  }

  // includeDeleted is admin-only
  if (body.includeDeleted === true && !admin) {
    throw new HttpException("Forbidden: includeDeleted requires admin", 403);
  }

  // Build created_at range condition only when any bound present
  const createdAtCondition: Record<string, unknown> | undefined =
    (body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
      ? {
          ...(body.createdAtFrom !== undefined &&
            body.createdAtFrom !== null && { gte: body.createdAtFrom }),
          ...(body.createdAtTo !== undefined &&
            body.createdAtTo !== null && { lte: body.createdAtTo }),
        }
      : undefined;

  // Build where condition with safe conditional inclusions
  const whereCondition = {
    ...(body.includeDeleted !== true && { deleted_at: null }),
    ...(createdAtCondition !== undefined && { created_at: createdAtCondition }),
    ...(body.anonymousLabelSearch !== undefined &&
      body.anonymousLabelSearch !== null && {
        anonymous_label: { contains: body.anonymousLabelSearch },
      }),
  };

  // Determine sorting field and direction (map to Prisma column names)
  const sortField =
    body.sortBy === "updatedAt"
      ? "updated_at"
      : body.sortBy === "anonymousLabel"
        ? "anonymous_label"
        : "created_at";
  const direction = body.order === "desc" ? "desc" : "asc";

  const skip = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_guest.findMany({
        where: whereCondition,
        orderBy: { [sortField]: direction },
        skip,
        take: limit,
        select: {
          id: true,
          anonymous_label: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      }),
      MyGlobal.prisma.todo_app_guest.count({ where: whereCondition }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      anonymousLabel: r.anonymous_label ?? null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      // Present deletedAt field as nullable; consumers may request includeDeleted
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    const pagination = {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    };

    return {
      pagination,
      data,
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
