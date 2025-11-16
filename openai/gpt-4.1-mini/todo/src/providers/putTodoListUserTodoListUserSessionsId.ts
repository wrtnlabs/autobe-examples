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

export async function putTodoListUserTodoListUserSessionsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IUpdate;
}): Promise<ITodoListUserSession> {
  const existing = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.id },
  });
  if (!existing) {
    throw new HttpException("User session not found", 404);
  }
  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const ipValue = props.body.ip === undefined ? existing.ip : props.body.ip;
  const hrefValue =
    props.body.href === undefined ? existing.href : props.body.href;
  const referrerValue =
    props.body.referrer === undefined ? existing.referrer : props.body.referrer;

  const updated = await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: props.id },
    data: {
      ip: ipValue === null ? undefined : ipValue,
      href: hrefValue === null ? undefined : hrefValue,
      referrer: referrerValue === null ? undefined : referrerValue,
      expired_at:
        props.body.expired_at === undefined
          ? existing.expired_at === null
            ? null
            : toISOStringSafe(existing.expired_at)
          : props.body.expired_at === null
            ? null
            : toISOStringSafe(props.body.expired_at),
    },
  });

  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
    href: updated.href,
    ip: updated.ip ?? null,
    referrer: updated.referrer,
    todo_list_user_id: updated.todo_list_user_id,
  };
}
