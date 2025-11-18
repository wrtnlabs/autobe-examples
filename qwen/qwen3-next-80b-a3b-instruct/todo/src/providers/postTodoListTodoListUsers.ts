import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postTodoListTodoListUsers(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser> {
  const created = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    created_at: toISOStringSafe(created.created_at),
    updated_at:
      created.updated_at !== null
        ? toISOStringSafe(created.updated_at)
        : undefined,
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
