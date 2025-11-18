import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const created = await MyGlobal.prisma.todo_list_guest.create({
    data: {
      email: props.body.email,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      id: v4() as string & tags.Format<"uuid">,
    },
  });

  return {
    email: created.email,
  };
}
