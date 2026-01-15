import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoListTodoCollector } from "../collectors/TodoListTodoCollector";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: await TodoListTodoCollector.collect({
      body: props.body,
      todoListUser: { id: props.user.id },
      todoListUserSession: { id: props.user.session_id },
    }),
  });
  return {
    id: created.id,
    title: created.title,
    details: created.description !== null ? created.description : undefined,
    completed: created.status === "completed",
    priority:
      created.status === "high"
        ? "high"
        : created.status === "medium"
          ? "medium"
          : "low",
    sequence: 0,
    createdAt: toISOStringSafe(created.created_at),
    user: {
      id: props.user.id,
      email: "",
      username: "",
      createdAt: toISOStringSafe(new Date(created.created_at)),
      isActive: true,
      role: "user",
    },
  };
}
