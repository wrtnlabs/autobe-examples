import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Find the todo and verify ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      deleted_at: true,
    },
  });
  // Handle not found (also covers ownership violation for privacy)
  if (todo === null || todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Todo not found", 404);
  }
  // Check if todo is in trash
  if (todo.deleted_at !== null) {
    throw new HttpException(
      "Cannot edit a deleted todo. Restore it first.",
      400,
    );
  }
  // Helper to compare values (handles null/undefined and Date/ISO string)
  const isSameValue = (a: unknown, b: unknown): boolean => {
    if (a === b) return true;
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (a instanceof Date && typeof b === "string") {
      return a.toISOString() === b;
    }
    return false;
  };
  // Normalize input values (undefined means keep current, so compare with current)
  const newTitle = props.body.title;
  const newDescription =
    props.body.description !== undefined
      ? (props.body.description ?? null)
      : todo.description;
  const newStartDate =
    props.body.startDate !== undefined
      ? props.body.startDate !== null
        ? new Date(props.body.startDate)
        : null
      : todo.start_date;
  const newDueDate =
    props.body.dueDate !== undefined
      ? props.body.dueDate !== null
        ? new Date(props.body.dueDate)
        : null
      : todo.due_date;
  // Detect changes
  const titleChanged = newTitle !== todo.title;
  const descriptionChanged = newDescription !== todo.description;
  const startDateChanged = !isSameValue(newStartDate, todo.start_date);
  const dueDateChanged = !isSameValue(newDueDate, todo.due_date);
  // If no changes detected, return current todo
  if (
    !titleChanged &&
    !descriptionChanged &&
    !startDateChanged &&
    !dueDateChanged
  ) {
    const currentTodo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...TodoAppTodoTransformer.select(),
    });
    return await TodoAppTodoTransformer.transform(currentTodo);
  }
  // Execute transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Create history entry for changed fields only
    MyGlobal.prisma.todo_app_todo_histories.create({
      data: {
        id: v4(),
        todo: { connect: { id: props.todoId } },
        edited_at: now,
        title_change: titleChanged ? newTitle : null,
        description_change: descriptionChanged ? newDescription : null,
        start_date_change: startDateChanged ? newStartDate : null,
        due_date_change: dueDateChanged ? newDueDate : null,
      },
    }),
    // Update the todo
    MyGlobal.prisma.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
        updated_at: now,
      },
    }),
  ]);
  // Return updated todo
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updatedTodo);
}
