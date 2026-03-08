import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  if (todo.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.is_deleted) {
    throw new HttpException("Not Found", 404);
  }
  const updateData: Prisma.todo_app_todosUpdateInput = {};
  if (props.body.title !== undefined && props.body.title !== todo.title) {
    updateData.title = props.body.title;
  }
  if (
    props.body.description !== undefined &&
    props.body.description !== todo.description
  ) {
    updateData.description = props.body.description;
  }
  if (
    props.body.start_date !== undefined &&
    props.body.start_date !== todo.start_date
  ) {
    updateData.start_date = props.body.start_date;
  }
  if (
    props.body.due_date !== undefined &&
    props.body.due_date !== todo.due_date
  ) {
    updateData.due_date = props.body.due_date;
  }
  if (
    props.body.is_complete !== undefined &&
    props.body.is_complete !== todo.is_complete
  ) {
    updateData.is_complete = props.body.is_complete;
  }
  if (Object.keys(updateData).length > 0) {
    const historyData: Prisma.todo_app_edit_historiesCreateInput = {
      id: v4(),
      todo: { connect: { id: props.todoId } },
      member: { connect: { id: props.member.id } },
      created_at: new Date(),
      ...(props.body.title !== undefined && props.body.title !== todo.title
        ? {
            previous_title: todo.title,
            new_title: props.body.title,
          }
        : {}),
      ...(props.body.description !== undefined &&
      props.body.description !== todo.description
        ? {
            previous_description: todo.description,
            new_description: props.body.description,
          }
        : {}),
      ...(props.body.start_date !== undefined &&
      props.body.start_date !== todo.start_date
        ? {
            previous_start_date: todo.start_date,
            new_start_date: props.body.start_date,
          }
        : {}),
      ...(props.body.due_date !== undefined &&
      props.body.due_date !== todo.due_date
        ? {
            previous_due_date: todo.due_date,
            new_due_date: props.body.due_date,
          }
        : {}),
    };
    await MyGlobal.prisma.todo_app_edit_histories.create({
      data: historyData,
    });
    updateData.updated_at = new Date();
  }
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updated);
}
