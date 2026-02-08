import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function postMultiUserTodoUserCompletionToggle(props: {
  user: UserPayload;
  body: IMultiUserTodoTodo.IToggleCompletionRequest;
}): Promise<IMultiUserTodoTodo> {
  const todoId = (props.body as any).id ?? (props.body as any).todoId;
  if (typeof todoId !== "string") {
    throw new HttpException("Invalid todo id", 400);
  }
  // Fix: for relation filter, supply object filter with equals or is
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: todoId,
      user: {
        is: {
          id: props.user.id,
        },
      },
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or forbidden", 404);
  }
  const toggledCompletion = !todo.completed;
  const updated = await MyGlobal.prisma.multi_user_todo_todos.update({
    where: {
      id: todoId,
    },
    data: {
      completed: toggledCompletion,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    ...updated,
    created_at: toISOStringSafe(new Date(updated.created_at)),
    updated_at: toISOStringSafe(new Date(updated.updated_at)),
  };
}
