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
  // Parameters
  const {
    page = 1,
    limit = 50,
    search,
    order_by = "created_at",
    order_direction = "desc",
  } = props.body;

  // Sanitize and bound pagination limit
  const safeLimit = Math.max(1, Math.min(50, Number(limit)));
  const safePage = Math.max(1, Number(page));
  const skip = (safePage - 1) * safeLimit;

  // Prisma where condition: restrict strictly to this user's account, apply search if present
  const whereCondition = {
    id: props.user.id,
    ...(search ? { email: { contains: search } } : {}),
  };

  // Allowed sort fields
  const allowedOrderFields = ["email", "created_at", "updated_at"];
  const sortField = allowedOrderFields.includes(order_by as string)
    ? order_by
    : "created_at";
  const sortDirection = order_direction === "asc" ? "asc" : "desc";

  // Query user summaries and count in parallel (there will be max one matching result, but structure supports pagination)
  const [users, total] = await Promise.all([
    MyGlobal.prisma.todo_users.findMany({
      where: whereCondition,
      skip,
      take: safeLimit,
      orderBy: { [sortField]: sortDirection },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.todo_users.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    })),
  };
}
