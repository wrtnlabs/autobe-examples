import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodoListUserSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.ICreate;
}): Promise<ITodoListUserSession> {
  const created = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4() satisfies string as string,
      todo_list_user_id: props.user.id satisfies string as string,
      href: props.body.href,
      ip: props.body.ip ?? "",
      referrer: props.body.referrer,
      expired_at:
        props.body.expired_at !== null && props.body.expired_at !== undefined
          ? toISOStringSafe(props.body.expired_at)
          : null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    href: created.href,
    ip: created.ip === null ? undefined : created.ip,
    referrer: created.referrer,
    expired_at:
      created.expired_at !== null && created.expired_at !== undefined
        ? toISOStringSafe(created.expired_at)
        : null,
    created_at: toISOStringSafe(created.created_at),
  };
}
