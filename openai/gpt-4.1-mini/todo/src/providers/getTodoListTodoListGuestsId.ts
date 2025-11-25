import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function getTodoListTodoListGuestsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListGuest> {
  const guest = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: { id: props.id },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  return {
    id: guest.id,
    visitor_ip: guest.visitor_ip,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
  };
}
