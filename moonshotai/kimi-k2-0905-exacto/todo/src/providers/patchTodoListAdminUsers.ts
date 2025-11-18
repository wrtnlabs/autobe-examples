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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsers(props: {
  admin: AdminPayload;
  body: ITodoListUser.IRequest;
}): Promise<IPageITodoListUser.ISummary> {
  const {
    email,
    is_locked,
    created_at_from,
    created_at_to,
    updated_at_from,
    updated_at_to,
    page,
    page_size,
    sort_by,
    sort_order,
  } = props.body;

  // Page math
  const skip = (page - 1) * page_size;
  const take = page_size;

  // Build filter conditions for Prisma
  const where = {
    ...(typeof email === "string" &&
      email.length > 0 && {
        email: { contains: email, mode: "insensitive" as Prisma.QueryMode },
      }),
    ...(typeof is_locked === "boolean" && { is_locked }),
    ...((created_at_from || created_at_to) && {
      created_at: {
        ...(created_at_from && { gte: created_at_from }),
        ...(created_at_to && { lte: created_at_to }),
      },
    }),
    ...((updated_at_from || updated_at_to) && {
      updated_at: {
        ...(updated_at_from && { gte: updated_at_from }),
        ...(updated_at_to && { lte: updated_at_to }),
      },
    }),
  };

  // Validate sort_by and sort_order enumerations
  const validSortBy = ["created_at", "updated_at", "email"];
  const sortField = validSortBy.includes(sort_by) ? sort_by : "created_at";
  const sortDirection = sort_order === "desc" ? "desc" : "asc";

  // Fetch users with pagination/sorting
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_list_users.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortDirection },
    }),
    MyGlobal.prisma.todo_list_users.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: users.map((row) => ({
      id: row.id,
      email: row.email,
      is_locked: row.is_locked,
    })),
  };
}
