import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
    },
  });
  const transformed: any = {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    completed: todo.is_complete,
    createdAt: todo.created_at ? toISOStringSafe(todo.created_at) : null,
    updatedAt: todo.updated_at ? toISOStringSafe(todo.updated_at) : null,
    todoAppUserId: todo.todo_app_user_id,
  };
  return transformed;
}
