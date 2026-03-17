import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Step 1: Verify ownership and fetch current todo with all fields needed for history
  const currentTodo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      member_id: props.member.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_complete: true,
      deleted_at: true,
    },
  });
  if (currentTodo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // Step 2: State validation - reject updates to soft-deleted todos
  if (currentTodo.deleted_at !== null) {
    throw new HttpException(
      "Cannot edit a todo that has been moved to trash",
      422,
    );
  }
  // Step 3: Calculate final values and completion timestamp
  const finalTitle = props.body.title ?? currentTodo.title;
  const finalDescription = props.body.description ?? currentTodo.description;
  const finalStartDate =
    props.body.start_date === undefined
      ? currentTodo.start_date
      : props.body.start_date === null
        ? null
        : props.body.start_date;
  const finalDueDate =
    props.body.due_date === undefined
      ? currentTodo.due_date
      : props.body.due_date === null
        ? null
        : props.body.due_date;
  const finalIsComplete = props.body.is_complete ?? currentTodo.is_complete;
  // Calculate completed_at based on is_complete state
  let finalCompletedAt: Date | null;
  if (finalIsComplete) {
    // Keep existing completed_at if already complete, otherwise set now
    finalCompletedAt = currentTodo.is_complete
      ? (await MyGlobal.prisma.multi_user_todo_todos.findUnique({
          where: { id: props.todoId },
          select: { completed_at: true },
        }))!.completed_at
      : new Date();
  } else {
    finalCompletedAt = null;
  }
  // Step 4: Execute transaction - update todo and create history
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the todo
    await tx.multi_user_todo_todos.update({
      where: { id: props.todoId },
      data: {
        title: finalTitle,
        description: finalDescription,
        start_date: finalStartDate === null ? null : new Date(finalStartDate),
        due_date: finalDueDate === null ? null : new Date(finalDueDate),
        is_complete: finalIsComplete,
        completed_at: finalCompletedAt,
        updated_at: new Date(),
      },
    });
    // Create edit history entry with final values
    await tx.multi_user_todo_histories.create({
      data: {
        id: v4(),
        todo: { connect: { id: props.todoId } },
        title: finalTitle,
        description: finalDescription,
        start_date: finalStartDate === null ? null : new Date(finalStartDate),
        due_date: finalDueDate === null ? null : new Date(finalDueDate),
        is_completed: finalIsComplete,
        created_at: new Date(),
      },
    });
  });
  // Step 5: Fetch updated todo with full selection and return
  const updatedTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return MultiUserTodoTodoTransformer.transform(updatedTodo);
}
