import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppTodoTransformer } from "../transformers/PrivateTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putPrivateTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IPrivateTodoAppTodo.IUpdate;
}): Promise<IPrivateTodoAppTodo> {
  // 1. Find the todo and verify ownership + not in trash
  const existingTodo =
    await MyGlobal.prisma.private_todo_app_todos.findFirstOrThrow({
      where: {
        id: props.todoId,
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        title: true,
        description: true,
        start_date: true,
        due_date: true,
      },
    });
  const now = new Date();
  // 2. Determine the actual new values (undefined means keep existing)
  const newTitle = props.body.title;
  const newDescription =
    props.body.description !== undefined
      ? props.body.description
      : existingTodo.description;
  const newStartDate =
    props.body.startDate !== undefined
      ? props.body.startDate !== null
        ? new Date(props.body.startDate)
        : null
      : existingTodo.start_date;
  const newDueDate =
    props.body.dueDate !== undefined
      ? props.body.dueDate !== null
        ? new Date(props.body.dueDate)
        : null
      : existingTodo.due_date;
  // 3. Determine which fields changed for edit history
  const titleChanged = existingTodo.title !== newTitle;
  const descriptionChanged = existingTodo.description !== newDescription;
  const startDateChanged =
    (existingTodo.start_date?.getTime() ?? null) !==
    (newStartDate?.getTime() ?? null);
  const dueDateChanged =
    (existingTodo.due_date?.getTime() ?? null) !==
    (newDueDate?.getTime() ?? null);
  // 4. Update the todo
  await MyGlobal.prisma.private_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      title: newTitle,
      description: newDescription,
      start_date: newStartDate,
      due_date: newDueDate,
      updated_at: now,
    },
  });
  // 5. Create edit history entries for changed fields
  const historyEntries = [];
  if (titleChanged) {
    historyEntries.push({
      id: v4(),
      private_todo_app_todo_id: props.todoId,
      created_at: now,
      title: newTitle,
    });
  }
  if (descriptionChanged) {
    historyEntries.push({
      id: v4(),
      private_todo_app_todo_id: props.todoId,
      created_at: now,
      description: newDescription,
    });
  }
  if (startDateChanged) {
    historyEntries.push({
      id: v4(),
      private_todo_app_todo_id: props.todoId,
      created_at: now,
      start_date: newStartDate,
    });
  }
  if (dueDateChanged) {
    historyEntries.push({
      id: v4(),
      private_todo_app_todo_id: props.todoId,
      created_at: now,
      due_date: newDueDate,
    });
  }
  if (historyEntries.length > 0) {
    await MyGlobal.prisma.private_todo_app_todo_edit_histories.createMany({
      data: historyEntries,
    });
  }
  // 6. Fetch and return the updated todo using transformer
  const updated =
    await MyGlobal.prisma.private_todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...PrivateTodoAppTodoTransformer.select(),
    });
  return PrivateTodoAppTodoTransformer.transform(updated);
}
