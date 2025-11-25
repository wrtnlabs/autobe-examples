import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodoListGuestsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListGuest.IUpdate;
}): Promise<ITodoListGuest> {
  const existing = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("Guest not found", 404);
  }

  const updated = await MyGlobal.prisma.todo_list_guests.update({
    where: { id: props.id },
    data: {
      visitor_ip: props.body.visitor_ip,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    visitor_ip: updated.visitor_ip,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
