import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouserSession";
import { IPageITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodouserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoListTodoUserTodoUsersTodoUserIdSessions(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  body: ITodoListTodouserSession.IRequest;
}): Promise<IPageITodoListTodouserSession.ISummary> {
  const { todoUser, todoUserId, body } = props;

  // 1. Enforce authorization: users can only view their own sessions
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "You are not authorized to view sessions of other users.",
      403,
    );
  }

  // 2. Prepare pagination variables (remove typia tags for numbers for Prisma)
  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  // 3. Build filter conditions
  const where: Record<string, any> = { todo_list_todouser_id: todoUserId };
  // Active filter
  if (body.active === true) where.expired_at = null;
  else if (body.active === false) where.expired_at = { not: null };
  // Created date filters
  if (body.createdFrom)
    where.created_at = { ...(where.created_at ?? {}), gte: body.createdFrom };
  if (body.createdTo)
    where.created_at = { ...(where.created_at ?? {}), lte: body.createdTo };

  // 4. Build order
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    body.orderBy &&
    (body.orderBy === "created_at" || body.orderBy === "expired_at")
  ) {
    orderBy = {
      [body.orderBy]: body.orderDirection === "asc" ? "asc" : "desc",
    };
  } else if (body.orderDirection) {
    orderBy = { created_at: body.orderDirection === "asc" ? "asc" : "desc" };
  }

  // 5. Query sessions and count for pagination
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todouser_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_todouser_sessions.count({ where }),
  ]);

  // 6. Transform to ISummary[]
  const data = sessions.map((s) => ({
    id: s.id,
    ip: s.ip,
    href: s.href,
    referrer: s.referrer,
    created_at: toISOStringSafe(s.created_at),
    expired_at:
      typeof s.expired_at !== "undefined" && s.expired_at !== null
        ? toISOStringSafe(s.expired_at)
        : undefined,
  }));

  // 7. Construct pagination
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  // 8. Return result
  return {
    pagination,
    data,
  };
}
