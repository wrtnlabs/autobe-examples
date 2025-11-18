import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function patchTodoListUsersEmailSessions(props: {
  email: string;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  // Locate the user by email (must exist, globally unique)
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.email },
    select: { id: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const sortBy = props.body.sort_by ?? "created_at";
  const desc = props.body.desc ?? false;
  const skip = (page - 1) * limit;

  // Sorting direction
  const orderBy: Record<string, "asc" | "desc"> = {};
  orderBy[sortBy] = desc ? "desc" : "asc";

  // Query session records (data + total count in parallel)
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: { todo_list_user_id: user.id },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where: { todo_list_user_id: user.id },
    }),
  ]);

  // Compose summary for each session (following strict ISummary DTO)
  const data: ITodoListUserSession.ISummary[] = sessions.map((session) => ({
    id: session.id,
    user: { id: user.id },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  // Compose and return the paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
