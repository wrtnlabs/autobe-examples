import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  // Validate status is one of the allowed values
  const status = props.body.status ?? "pending";
  if (status !== "pending" && status !== "completed") {
    throw new HttpException(
      "Status must be either 'pending' or 'completed'",
      400,
    );
  }

  // Create the todo record
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Convert and return the created todo
  return {
    title: created.title,
    description: created.description === null ? undefined : created.description,
    status: created.status as "pending" | "completed",
  };
}
