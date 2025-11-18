import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import { IPageITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoListGuestsTodoListGuestIdTodoListGuestSessions(props: {
  user: UserPayload;
  todoListGuestId: string & tags.Format<"uuid">;
  body: ITodoListGuestSession.IRequest;
}): Promise<IPageITodoListGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    todo_list_guest_id: props.todoListGuestId,
    ip: props.body.ip ?? undefined,
    href: props.body.href ?? undefined,
    referrer: props.body.referrer ?? undefined,
    expired_at:
      props.body.expired === undefined
        ? undefined
        : props.body.expired
          ? { not: null }
          : null,
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_guest_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_guest_sessions.count({ where: whereCondition }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      todo_list_guest_id: session.todo_list_guest_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
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
