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
  const existingTodo = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_complete: true,
      is_deleted: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (existingTodo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (
    props.body.title === undefined &&
    props.body.description === undefined &&
    props.body.start_date === undefined &&
    props.body.due_date === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  const now = toISOStringSafe(new Date());
  const updateData: {
    title?: string;
    description?: string | null;
    start_date?: (string & tags.Format<"date-time">) | null;
    due_date?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date = props.body.start_date ?? null;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date ?? null;
  }
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
    },
    data: updateData,
  });
  const editData = {
    id: v4(),
    todo_id: props.todoId,
    edited_at: now,
    old_title: existingTodo.title,
    new_title: props.body.title ?? existingTodo.title,
    old_description: existingTodo.description,
    new_description:
      props.body.description !== undefined
        ? props.body.description
        : existingTodo.description,
    old_start_date: existingTodo.start_date,
    new_start_date: props.body.start_date ?? null,
    old_due_date: existingTodo.due_date,
    new_due_date: props.body.due_date ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await MyGlobal.prisma.multi_user_todo_todos_edits.create({
    data: editData,
  });
  const updated = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow(
    {
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    },
  );
  return await MultiUserTodoTodoTransformer.transform(updated);
}
