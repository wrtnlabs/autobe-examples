import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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
  // Find existing todo with ownership check (member owns it) and not in trash
  const existingTodo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
    ...MultiUserTodoTodoTransformer.select(),
  });
  if (existingTodo === null) {
    throw new HttpException("Not found", 404);
  }
  // Validate date business rule: due_date must be after start_date if both provided
  const newStartDate =
    props.body.start_date !== undefined && props.body.start_date !== null
      ? new Date(props.body.start_date)
      : existingTodo.start_date;
  const newDueDate =
    props.body.due_date !== undefined && props.body.due_date !== null
      ? new Date(props.body.due_date)
      : existingTodo.due_date;
  if (
    newStartDate !== null &&
    newDueDate !== null &&
    newDueDate <= newStartDate
  ) {
    throw new HttpException("Due date must be after start date", 400);
  }
  // Build update data object - only include provided fields
  const updateData: Prisma.multi_user_todo_todosUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date =
      props.body.start_date === null ? null : new Date(props.body.start_date);
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date =
      props.body.due_date === null ? null : new Date(props.body.due_date);
  }
  // Create edit history entries for changed fields
  const editHistoryEntries: Array<Prisma.multi_user_todo_todo_edit_historiesCreateWithoutTodoInput> =
    [];
  // Track title changes
  if (
    props.body.title !== undefined &&
    props.body.title !== existingTodo.title
  ) {
    editHistoryEntries.push({
      id: v4(),
      old_title: existingTodo.title,
      new_title: props.body.title,
      created_at: new Date(),
    });
  }
  // Track description changes
  if (
    props.body.description !== undefined &&
    props.body.description !== existingTodo.description
  ) {
    editHistoryEntries.push({
      id: v4(),
      old_description: existingTodo.description,
      new_description: props.body.description,
      created_at: new Date(),
    });
  }
  // Track start_date changes
  if (props.body.start_date !== undefined) {
    const oldStartDateStr =
      existingTodo.start_date !== null
        ? toISOStringSafe(existingTodo.start_date)
        : null;
    if (oldStartDateStr !== props.body.start_date) {
      editHistoryEntries.push({
        id: v4(),
        old_start_date: oldStartDateStr !== null ? oldStartDateStr : undefined,
        new_start_date: props.body.start_date,
        created_at: new Date(),
      });
    }
  }
  // Track due_date changes
  if (props.body.due_date !== undefined) {
    const oldDueDateStr =
      existingTodo.due_date !== null
        ? toISOStringSafe(existingTodo.due_date)
        : null;
    if (oldDueDateStr !== props.body.due_date) {
      editHistoryEntries.push({
        id: v4(),
        old_due_date: oldDueDateStr !== null ? oldDueDateStr : undefined,
        new_due_date: props.body.due_date,
        created_at: new Date(),
      });
    }
  }
  // Execute update and create edit history entries in transaction
  const transactionOperations: Prisma.PrismaPromise<unknown>[] = [
    MyGlobal.prisma.multi_user_todo_todos.update({
      where: { id: props.todoId },
      data: updateData,
    }),
  ];
  for (const entry of editHistoryEntries) {
    transactionOperations.push(
      MyGlobal.prisma.multi_user_todo_todo_edit_histories.create({
        data: {
          ...entry,
          todo: { connect: { id: props.todoId } },
        },
      }),
    );
  }
  await MyGlobal.prisma.$transaction(transactionOperations);
  // Fetch and return the complete updated todo
  const updatedTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findFirstOrThrow({
      where: {
        id: props.todoId,
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(updatedTodo);
}
