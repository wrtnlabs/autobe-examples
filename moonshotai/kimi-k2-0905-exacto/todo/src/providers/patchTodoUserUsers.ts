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
  const { body } = props;

  // Calculate pagination values with proper type handling
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build where clause for search filtering
  const where = body.search
    ? {
        email: { contains: body.search },
      }
    : {};

  // Determine order by field and direction
  const orderBy =
    body.order_by === "email"
      ? { email: body.order_direction ?? "desc" }
      : body.order_by === "mfa_enabled"
        ? { mfa_enabled: body.order_direction ?? "desc" }
        : body.order_by === "failed_login_attempts"
          ? { failed_login_attempts: body.order_direction ?? "desc" }
          : { created_at: body.order_direction ?? "desc" };

  // Execute parallel queries for data and count
  const [users, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_users.findMany({
      where,
      include: {
        _count: {
          select: { todo_tasks: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_users.count({ where }),
  ]);

  // Map results to API response structure
  const data: ITodoUser.ISummary[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    mfa_enabled: user.mfa_enabled,
    tasks_count: user._count.todo_tasks,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  }));

  // Build pagination object
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: totalCount,
    pages: Math.ceil(totalCount / limit),
  };

  return {
    pagination,
    data,
  };
}
