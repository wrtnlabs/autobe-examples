import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function postTodoListTodoListGuests(props: {
  body: ITodoListGuest.ICreate;
}): Promise<ITodoListGuest> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_list_guests.create({
    data: {
      id: v4(),
      visitor_ip: props.body.visitor_ip,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    visitor_ip: created.visitor_ip,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
