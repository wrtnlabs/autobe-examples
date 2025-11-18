import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminUsers(props: {
  admin: AdminPayload;
  body: ITodoAppUser.IRequest;
}): Promise<IPageITodoAppUser.ISummary> {
  const { page, limit, search, status, sort_by, sort_order } = props.body;

  // Validation for status, sort_by, sort_order
  const allowedStatuses = [undefined, "active", "deleted"];
  if (!allowedStatuses.includes(status)) {
    throw new HttpException("Invalid status value", 400);
  }
  const allowedSortBy = [undefined, "email", "created_at", "updated_at"];
  if (!allowedSortBy.includes(sort_by)) {
    throw new HttpException("Invalid sort_by value", 400);
  }
  const allowedSortOrder = [undefined, "asc", "desc"];
  if (!allowedSortOrder.includes(sort_order)) {
    throw new HttpException("Invalid sort_order value", 400);
  }

  const skip = (page - 1) * limit;

  // Building dynamic where clause
  const where: Record<string, unknown> = {};
  if (search && typeof search === "string") {
    where.email = { contains: search };
  }
  if (status === "active") {
    where.deleted_at = null;
  }
  if (status === "deleted") {
    where.deleted_at = { not: null };
  }

  // Sorting
  let orderBy: Record<string, "asc" | "desc">;
  if (sort_by) {
    orderBy = { [sort_by]: sort_order === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }

  // Run paginated query and total count concurrently
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_app_users.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_users.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    })),
  };
}
