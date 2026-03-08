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
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Step 1: Find the todo and verify ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found or unauthorized", 404);
  }
  // Step 2: Collect changes for edit history
  const changes: {
    field: string;
    previousValue: string | null;
    newValue: string | null;
  }[] = [];
  // Step 3: Apply updates to provided fields
  const updateData: Prisma.todo_app_todosUpdateInput = {};
  // Title update
  if (props.body.title !== undefined) {
    changes.push({
      field: "title",
      previousValue: todo.title,
      newValue: props.body.title,
    });
    updateData.title = props.body.title;
  }
  // Description update
  if (props.body.description !== undefined) {
    changes.push({
      field: "description",
      previousValue: todo.description ?? null,
      newValue: props.body.description,
    });
    updateData.description = props.body.description;
  }
  // Start date update
  if (props.body.start_date !== undefined) {
    changes.push({
      field: "start_date",
      previousValue: todo.start_date ?? null,
      newValue: props.body.start_date,
    });
    updateData.start_date = props.body.start_date;
  }
  // Due date update
  if (props.body.due_date !== undefined) {
    changes.push({
      field: "due_date",
      previousValue: todo.due_date ?? null,
      newValue: props.body.due_date,
    });
    updateData.due_date = props.body.due_date;
  }
  // Validate date constraints if both dates provided
  if (
    props.body.start_date !== undefined &&
    props.body.due_date !== undefined
  ) {
    const startDateMs = Date.parse(props.body.start_date);
    const dueDateMs = Date.parse(props.body.due_date);
    if (startDateMs > dueDateMs) {
      throw new HttpException("Start date cannot be later than due date", 400);
    }
  }
  // Update timestamp
  updateData.updated_at = new Date();
  // Step 4: Update the todo
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  // Step 5: Create edit history entries for each changed field
  // Create edit record first
  const editRecord = await MyGlobal.prisma.todo_app_todo_edits.create({
    data: {
      id: v4(),
      todo_id: props.todoId,
      edited_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      previous_title:
        changes.find((c) => c.field === "title")?.previousValue ?? null,
      new_title: changes.find((c) => c.field === "title")?.newValue ?? null,
      previous_description:
        changes.find((c) => c.field === "description")?.previousValue ?? null,
      new_description:
        changes.find((c) => c.field === "description")?.newValue ?? null,
      previous_start_date:
        changes.find((c) => c.field === "start_date")?.previousValue ?? null,
      new_start_date:
        changes.find((c) => c.field === "start_date")?.newValue ?? null,
      previous_due_date:
        changes.find((c) => c.field === "due_date")?.previousValue ?? null,
      new_due_date:
        changes.find((c) => c.field === "due_date")?.newValue ?? null,
    },
  });
  // Then create history entries
  for (const change of changes) {
    await MyGlobal.prisma.todo_app_edit_history_entries.create({
      data: {
        id: v4(),
        todo_app_todo_edit_id: editRecord.id,
        created_at: new Date(),
        previous_title: change.field === "title" ? change.previousValue : null,
        new_title: change.field === "title" ? change.newValue : null,
        previous_description:
          change.field === "description" ? change.previousValue : null,
        new_description:
          change.field === "description" ? change.newValue : null,
        previous_start_date:
          change.field === "start_date" ? change.previousValue : null,
        new_start_date: change.field === "start_date" ? change.newValue : null,
        previous_due_date:
          change.field === "due_date" ? change.previousValue : null,
        new_due_date: change.field === "due_date" ? change.newValue : null,
      },
    });
  }
  // Step 6: Return the updated todo using transformer
  const result = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(result);
}
