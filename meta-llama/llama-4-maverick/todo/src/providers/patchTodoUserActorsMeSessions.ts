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

export async function patchTodoUserActorsMeSessions(props: {
  user: UserPayload;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession> {
  const { page = 1, limit = 20, search, order_by } = props.body ?? {};
  const offset = (page - 1) * limit;
  const where = {
    todo_user_id: props.user.id,
    ...(search && {
      OR: [
        { ip: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { href: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { referrer: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
  };
  const sessions = await MyGlobal.prisma.todo_user_sessions.findMany({
    where,
    orderBy: { [order_by ?? "created_at"]: "desc" },
    skip: offset,
    take: limit,
  });
  const total = await MyGlobal.prisma.todo_user_sessions.count({ where });
  return {
    data: sessions.map((s) => ({
      id: s.id,
      todo_user_id: s.todo_user_id,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at),
      expired_at:
        typeof s.expired_at === "undefined"
          ? undefined
          : s.expired_at
            ? toISOStringSafe(s.expired_at)
            : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
