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

export async function putMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodo.IUpdate;
}): Promise<IMultiUserTodoTodo> {
  // 1. Validate todo exists and belongs to member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
    },
  });
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Track changes for edit history
  const changedFields: Array<{
    field_name: string;
    previous_value: string | null;
    new_value: string;
  }> = [];
  // Helper to convert Date to ISO string for comparison
  const dateToISO = (date: Date | null): string | null =>
    date ? date.toISOString() : null;
  // Check each field for changes
  if (props.body.title !== undefined && props.body.title !== todo.title) {
    changedFields.push({
      field_name: "title",
      previous_value: todo.title,
      new_value: props.body.title,
    });
  }
  if (props.body.description !== undefined) {
    const newDesc = props.body.description;
    const currentDesc = todo.description;
    if (newDesc !== currentDesc) {
      changedFields.push({
        field_name: "description",
        previous_value: currentDesc,
        new_value: newDesc ?? "",
      });
    }
  }
  if (props.body.start_date !== undefined) {
    const newStart = props.body.start_date;
    const currentStart = dateToISO(todo.start_date);
    if (newStart !== currentStart) {
      changedFields.push({
        field_name: "start_date",
        previous_value: currentStart,
        new_value: newStart ?? "",
      });
    }
  }
  if (props.body.due_date !== undefined) {
    const newDue = props.body.due_date;
    const currentDue = dateToISO(todo.due_date);
    if (newDue !== currentDue) {
      changedFields.push({
        field_name: "due_date",
        previous_value: currentDue,
        new_value: newDue ?? "",
      });
    }
  }
  // If no changes, just return current todo
  if (changedFields.length === 0) {
    const current =
      await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
        where: { id: props.todoId },
        ...MultiUserTodoTodoTransformer.select(),
      });
    return await MultiUserTodoTodoTransformer.transform(current);
  }
  // Create edit history entry
  const editHistoryId = v4();
  await MyGlobal.prisma.multi_user_todo_edit_histories.create({
    data: {
      id: editHistoryId,
      multi_user_todo_todo_id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      created_at: new Date(),
      fieldChanges: {
        create: changedFields.map((field) => ({
          id: v4(),
          field_name: field.field_name,
          previous_value: field.previous_value,
          new_value: field.new_value,
          created_at: new Date(),
        })),
      },
    },
  });
  // Update todo with new values
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date
          ? new Date(props.body.start_date)
          : null,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return updated todo
  const updated = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow(
    {
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    },
  );
  return await MultiUserTodoTodoTransformer.transform(updated);
}
