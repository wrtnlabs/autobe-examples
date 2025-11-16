import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodoListGuestsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListTodoListGuest.IUpdate;
}): Promise<ITodoListTodoListGuest> {
  const existing = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: { id: props.id },
  });

  if (existing === null) {
    throw new HttpException("Guest user not found", 404);
  }

  const updated = await MyGlobal.prisma.todo_list_guests.update({
    where: { id: props.id },
    data: {},
  });

  return {
    id: updated.id satisfies string as string,
    content: (props.body.content !== undefined
      ? props.body.content
      : "") satisfies string as string,
    is_completed: (props.body.is_completed !== undefined
      ? props.body.is_completed
      : false) satisfies boolean as boolean,
    priority: (props.body.priority !== undefined
      ? props.body.priority
      : 1) satisfies number as number,
    created_at: toISOStringSafe(updated.created_at),
  } satisfies ITodoListTodoListGuest;
}
