import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsers(props: {
  user: UserPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const {
    page,
    limit,
    email,
    is_verified,
    locked,
    from_date,
    to_date,
    sort_by,
    sort_order,
  } = props.body;
  const skip = (page - 1) * limit;

  // Build Prisma where condition based on optional filters
  const where = {
    deleted_at: null,
    ...(typeof email === "string" ? { email: email } : {}),
    ...(typeof is_verified === "boolean" ? { is_verified: is_verified } : {}),
    ...(typeof locked === "boolean" ? { locked: locked } : {}),
    ...(from_date || to_date
      ? {
          created_at: {
            ...(from_date ? { gte: from_date } : {}),
            ...(to_date ? { lte: to_date } : {}),
          },
        }
      : {}),
  };

  // Restrict sort field and order to schema allowed values
  const sortableColumns = ["created_at", "email"] as const;
  const usedSortBy = sortableColumns.includes(
    sort_by as (typeof sortableColumns)[number],
  )
    ? sort_by
    : "created_at";
  const usedSortOrder =
    sort_order === "asc" || sort_order === "desc" ? sort_order : "desc";
  // Prisma expects the sort key to be a plain string, not possibly undefined
  const orderBy: Record<string, "asc" | "desc"> = {
    [usedSortBy!]: usedSortOrder,
  };

  // Query users and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
      },
    }),
    MyGlobal.prisma.todo_list_users.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((user) => ({
      id: user.id,
      email: user.email,
    })),
  };
}
