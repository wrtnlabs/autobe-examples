import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserTodoItems(props: {
  user: UserPayload;
  body: ITodoItem.ICreate;
}): Promise<ITodoItem> {
  await MyGlobal.prisma.todo_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: props.user.id,
      text: props.body.text,
      status: "pending",
      created_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return props.body.text;
}
