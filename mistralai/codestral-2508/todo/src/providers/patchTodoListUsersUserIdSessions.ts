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

export async function patchTodoListUsersUserIdSessions(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const {
    ip,
    href,
    referrer,
    created_from,
    created_to,
    expired,
    page,
    limit,
    sort,
  } = props.body;

  const sortMap = {
    "created_at:desc": [{ created_at: "desc" }],
    "created_at:asc": [{ created_at: "asc" }],
    "expired_at:desc": [{ expired_at: "desc" }, { created_at: "desc" }],
    "expired_at:asc": [{ expired_at: "asc" }, { created_at: "desc" }],
  } as const;
  const orderBy = [...sortMap[sort ?? "created_at:desc"]];

  // Build Prisma where condition
  const whereCond = {
    todo_list_user_id: props.userId,
    ...(typeof ip === "string" && ip !== "" && { ip: { contains: ip } }),
    ...(typeof href === "string" &&
      href !== "" && { href: { contains: href } }),
    ...(typeof referrer === "string" &&
      referrer !== "" && { referrer: { contains: referrer } }),
    ...(created_from && { created_at: { gte: created_from } }),
    ...(created_to && {
      created_at: {
        ...(created_from && { gte: created_from }),
        lte: created_to,
      },
    }),
    ...(expired === true && { expired_at: { not: null } }),
  };

  const pageNum = (page > 0 ? page : 1) satisfies number as number;
  const pageSize = (limit > 0 && limit <= 100
    ? limit
    : 20) satisfies number as number;
  const skip = (pageNum - 1) * pageSize;

  // Fetch sessions
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: whereCond,
      orderBy: orderBy,
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where: whereCond }),
  ]);

  // Fetch user info for each session (since include: {user:true} was broken)
  const usersMap = new Map<string, ITodoListUser.ISummary>();
  for (const session of sessions) {
    if (!usersMap.has(session.todo_list_user_id)) {
      const user = await MyGlobal.prisma.todo_list_users.findUnique({
        where: { id: session.todo_list_user_id },
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      });
      if (user) {
        usersMap.set(user.id, {
          id: user.id,
          email: user.email,
          display_name: user.display_name ?? undefined,
          created_at: toISOStringSafe(user.created_at),
        });
      }
    }
  }

  const data = sessions.map((s) => ({
    id: s.id,
    ip: s.ip,
    href: s.href,
    referrer: s.referrer,
    created_at: toISOStringSafe(s.created_at),
    expired_at: s.expired_at ? toISOStringSafe(s.expired_at) : undefined,
    user: usersMap.get(s.todo_list_user_id)!,
  }));

  return {
    pagination: {
      current: pageNum satisfies number as number,
      limit: pageSize satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / pageSize) satisfies number as number,
    },
    data,
  };
}
