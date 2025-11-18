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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersSelfSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession> {
  const {
    created_from,
    created_to,
    expired_from,
    expired_to,
    ip,
    href,
    referrer,
    page,
    limit,
  } = props.body;

  // Pagination logic
  const currentPage = page ?? 1;
  const pageLimit = limit ?? 20;
  const offset = (currentPage - 1) * pageLimit;

  // Build dynamic where clause
  const where: Record<string, unknown> = {
    todo_list_user_id: props.user.id,
    ...(created_from && {
      created_at: {
        ...(created_from && { gte: created_from }),
        ...(created_to && { lte: created_to }),
      },
    }),
    ...(!created_from &&
      created_to && {
        created_at: { lte: created_to },
      }),
    ...(expired_from && {
      expired_at: {
        ...(expired_from && { gte: expired_from }),
        ...(expired_to && { lte: expired_to }),
      },
    }),
    ...(!expired_from &&
      expired_to && {
        expired_at: { lte: expired_to },
      }),
    ...(ip && { ip }),
    ...(href && { href }),
    ...(referrer && { referrer }),
  };
  // Prisma rejects keys that are undefined, so strip them out
  // The above logic avoids undefined by object spread

  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: offset,
      take: pageLimit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null || session.expired_at === undefined
        ? null
        : toISOStringSafe(session.expired_at),
  }));

  return {
    data,
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: totalCount,
      pages: Math.ceil(totalCount / pageLimit),
    },
  };
}
