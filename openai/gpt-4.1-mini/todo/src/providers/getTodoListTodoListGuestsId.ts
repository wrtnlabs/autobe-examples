import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";

export async function getTodoListTodoListGuestsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListTodoListGuest> {
  const record = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: { id: props.id },
    select: {
      id: true,
      ip: true,
      user_agent: true,
      created_at: true,
    },
  });

  if (!record) {
    throw new HttpException("Guest todo item not found", 404);
  }

  return typia.random<ITodoListTodoListGuest>();
}
