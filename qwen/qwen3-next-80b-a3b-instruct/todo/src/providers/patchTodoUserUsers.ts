import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsers(props: {
  user: UserPayload;
  body: ITodoUser.IRequest;
}): Promise<IPageITodoUser.ISummary> {
  const {
    q,
    email,
    created_from,
    created_to,
    updated_from,
    updated_to,
    deleted,
    sort_by,
    sort_order,
    page,
    limit,
  } = props.body;

  const pageNumber = page ?? 1;
  const pageSize = limit ?? 100;
  const skip = (pageNumber - 1) * pageSize;

  // Compose filter
  const whereCondition: Record<string, unknown> = {
    ...(typeof deleted === "boolean"
      ? { deleted_at: deleted ? { not: null } : null }
      : {}),
    ...(email ? { email } : {}),
    ...(q ? { email: { contains: q } } : {}),
  };
  if (created_from || created_to) {
    whereCondition.created_at = {
      ...(created_from ? { gte: created_from } : {}),
      ...(created_to ? { lte: created_to } : {}),
    };
  }
  if (updated_from || updated_to) {
    whereCondition.updated_at = {
      ...(updated_from ? { gte: updated_from } : {}),
      ...(updated_to ? { lte: updated_to } : {}),
    };
  }

  // Sort
  const orderBy = sort_by
    ? { [sort_by]: (sort_order ?? "asc") as Prisma.SortOrder }
    : { created_at: "desc" as Prisma.SortOrder };

  // Query
  const [users, totalRecords] = await Promise.all([
    MyGlobal.prisma.todo_user.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.todo_user.count({ where: whereCondition }),
  ]);

  // ISO string for all date/datetime outputs (never Date type)
  const data = users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at:
      typeof user.created_at === "string"
        ? user.created_at
        : toISOStringSafe(user.created_at),
    deleted_at:
      user.deleted_at === null || user.deleted_at === undefined
        ? undefined
        : typeof user.deleted_at === "string"
          ? user.deleted_at
          : toISOStringSafe(user.deleted_at),
  }));

  return {
    pagination: {
      current: pageNumber,
      limit: pageSize,
      records: totalRecords,
      pages: Math.ceil(totalRecords / pageSize),
    },
    data,
  };
}
