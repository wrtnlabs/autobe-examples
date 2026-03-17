import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppMemberAtSummaryTransformer } from "../transformers/MultiUserTodoAppMemberAtSummaryTransformer";
import { MultiUserTodoAppTodoTransformer } from "../transformers/MultiUserTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoAppTodo.IUpdate;
}): Promise<IMultiUserTodoAppTodo> {
  const todo =
    await MyGlobal.prisma.multi_user_todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      select: {
        id: true,
        user_id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_completed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: MultiUserTodoAppMemberAtSummaryTransformer.select(),
        editHistories: true,
      },
    });
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.title !== undefined && props.body.title.trim() === "") {
    throw new HttpException("Title cannot be empty", 400);
  }
  const updateData: {
    title?: string;
    description?: string | null;
    start_date?: (string & tags.Format<"date-time">) | null;
    due_date?: (string & tags.Format<"date-time">) | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.start_date !== undefined) {
    updateData.start_date = props.body.start_date;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date;
  }
  await MyGlobal.prisma.multi_user_todo_app_todo_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_id: props.todoId,
      user_id: props.member.id,
      edited_at: new Date(),
      old_title: todo.title,
      new_title: props.body.title ?? todo.title,
      old_description: todo.description,
      new_description: props.body.description ?? todo.description,
      old_start_date: todo.start_date,
      new_start_date: props.body.start_date ?? todo.start_date,
      old_due_date: todo.due_date,
      new_due_date: props.body.due_date ?? todo.due_date,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.multi_user_todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
    select: {
      id: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_completed: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user: MultiUserTodoAppMemberAtSummaryTransformer.select(),
      editHistories: true,
    },
  });
  return await MultiUserTodoAppTodoTransformer.transform(updated);
}
