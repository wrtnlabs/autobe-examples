import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodoUsersTodoUserEmailSessions(props: {
  user: UserPayload;
  todoUserEmail: string;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession.ISummary> {
  const { user, todoUserEmail, body } = props;

  const foundUser = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      email: todoUserEmail,
      deleted_at: null,
    },
  });

  if (foundUser === null) {
    throw new HttpException("User not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const search = body.search?.trim();

  const sessions = await MyGlobal.prisma.todo_user_sessions.findMany({
    where: {
      todo_user_id: foundUser.id,
      ...(search !== undefined &&
        search !== "" && {
          OR: [
            { ip: { contains: search } },
            { referrer: { contains: search } },
          ],
        }),
    },
    orderBy:
      body.sortBy === "created_at" ||
      body.sortBy === "expired_at" ||
      body.sortBy === "ip"
        ? { [body.sortBy]: body.sortOrder === "asc" ? "asc" : "desc" }
        : { created_at: "desc" },
    skip,
    take: limit,
  });

  const total = await MyGlobal.prisma.todo_user_sessions.count({
    where: {
      todo_user_id: foundUser.id,
      ...(search !== undefined &&
        search !== "" && {
          OR: [
            { ip: { contains: search } },
            { referrer: { contains: search } },
          ],
        }),
    },
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      todo_user_id: session.todo_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
