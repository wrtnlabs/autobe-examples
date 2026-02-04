import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoTodoTransformer } from "../transformers/TodoTodoTransformer";

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_users_id !== props.user.id) {
    throw new HttpException("Unauthorized", 403);
  }
  if (
    props.body.startDate !== undefined &&
    props.body.dueDate !== undefined &&
    props.body.startDate !== null &&
    props.body.dueDate !== null &&
    props.body.startDate > props.body.dueDate
  ) {
    throw new HttpException("Start date cannot be after due date", 400);
  }
  const previous = {
    title: todo.title,
    description: todo.description,
    start_date: todo.start_date,
    due_date: todo.due_date,
    completed: todo.completed,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  };
  const updateData: {
    title?: string;
    description?: string;
    start_date?: string;
    due_date?: string;
  } = {};
  if (props.body.title !== undefined) updateData.title = props.body.title;
  updateData.description = props.body.description ?? undefined;
  updateData.start_date = props.body.startDate ?? undefined;
  updateData.due_date = props.body.dueDate ?? undefined;
  const updatedTodo = await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  const updatedTodoWithUser =
    await MyGlobal.prisma.todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
      },
    });
  const newValues = {
    title: updatedTodoWithUser.title,
    description: updatedTodoWithUser.description,
    start_date: updatedTodoWithUser.start_date,
    due_date: updatedTodoWithUser.due_date,
    completed: updatedTodoWithUser.completed,
    created_at: updatedTodoWithUser.created_at,
    updated_at: updatedTodoWithUser.updated_at,
  };
  await MyGlobal.prisma.todo_histories.create({
    data: {
      todo_todo_id: todo.id,
      previous: JSON.stringify(previous),
      new: JSON.stringify(newValues),
    },
  });
  return await TodoTodoTransformer.transform(updatedTodoWithUser);
}
