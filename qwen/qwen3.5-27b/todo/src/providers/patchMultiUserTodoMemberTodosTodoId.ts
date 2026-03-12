import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodo.IUpdate;
}): Promise<IMultiUserTodoTodo> {
  // Step 1: Find the todo and verify ownership
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      completed: true,
      deleted: true,
    },
  });
  // Step 2: Verify ownership
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Build update data with only provided fields
  const updateData: Prisma.multi_user_todo_todosUpdateInput = {
    updated_at: new Date(),
  };
  // Track which fields changed (for edit history)
  const changedFields: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }> = [];
  // Title
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
    if (props.body.title !== todo.title) {
      changedFields.push({
        field: "title",
        oldValue: todo.title,
        newValue: props.body.title,
      });
    }
  }
  // Description
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
    const oldDesc = todo.description ?? "";
    const newDesc = props.body.description ?? "";
    if (oldDesc !== newDesc) {
      changedFields.push({
        field: "description",
        oldValue: oldDesc,
        newValue: newDesc,
      });
    }
  }
  // Start date
  if (props.body.start_date !== undefined) {
    updateData.start_date = props.body.start_date
      ? new Date(props.body.start_date)
      : null;
    const oldStart = todo.start_date?.toISOString() ?? "";
    const newStart = props.body.start_date ? props.body.start_date : "";
    if (oldStart !== newStart) {
      changedFields.push({
        field: "start_date",
        oldValue: oldStart,
        newValue: newStart,
      });
    }
  }
  // Due date
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
    const oldDue = todo.due_date?.toISOString() ?? "";
    const newDue = props.body.due_date ? props.body.due_date : "";
    if (oldDue !== newDue) {
      changedFields.push({
        field: "due_date",
        oldValue: oldDue,
        newValue: newDue,
      });
    }
  }
  // Completed (not tracked in edit history)
  if (props.body.completed !== undefined) {
    updateData.completed = props.body.completed;
  }
  // Step 4: Update the todo
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  // Step 5: Create edit history entries for changed fields
  if (changedFields.length > 0) {
    const now = new Date();
    const historyEntries = changedFields.map((change) => ({
      id: v4() as string & tags.Format<"uuid">,
      multi_user_todo_todos_id: props.todoId,
      edit_timestamp: now,
      field_name: change.field,
      old_value: change.oldValue,
      new_value: change.newValue,
      created_at: now,
    }));
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.createMany({
      data: historyEntries,
    });
  }
  // Step 6: Fetch and return the updated todo
  const updatedTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(updatedTodo);
}
