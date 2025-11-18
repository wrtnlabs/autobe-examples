import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putTodoAppMemberUserTodosTodoId(props: {
  memberUser: MemberuserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const body = props.body;

  // 1. Load the existing todo, ensuring ownership and non-deleted state
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }

  // 2. Load the owning member user for response mapping
  const member = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: { id: props.memberUser.id },
  });

  if (member === null) {
    throw new HttpException("Member user not found", 404);
  }

  // 3. Determine whether there are any fields to update
  const hasUpdatableField =
    body.title !== undefined ||
    body.description !== undefined ||
    body.state !== undefined ||
    body.due_date !== undefined;

  // If no mutable fields were provided, return the current representation
  if (!hasUpdatableField) {
    return {
      id: existing.id,
      memberUser: {
        id: member.id,
        email: member.email,
        display_name: member.display_name === null ? null : member.display_name,
        status: member.status,
        created_at: toISOStringSafe(member.created_at),
      },
      title: existing.title,
      description: existing.description,
      state: existing.state,
      due_date:
        existing.due_date === null ? null : toISOStringSafe(existing.due_date),
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      completed_at:
        existing.completed_at === null
          ? null
          : toISOStringSafe(existing.completed_at),
      deleted_at:
        existing.deleted_at === null
          ? null
          : toISOStringSafe(existing.deleted_at),
    };
  }

  // 4. Perform the update with only the provided fields
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.state !== undefined && { state: body.state }),
      ...(body.due_date !== undefined && { due_date: body.due_date }),
    },
  });

  // 5. Map the updated record to ITodoAppTodo with correct null/undefined handling
  return {
    id: updated.id,
    memberUser: {
      id: member.id,
      email: member.email,
      display_name: member.display_name === null ? null : member.display_name,
      status: member.status,
      created_at: toISOStringSafe(member.created_at),
    },
    title: updated.title,
    description: updated.description,
    state: updated.state,
    due_date:
      updated.due_date === null ? null : toISOStringSafe(updated.due_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at === null
        ? null
        : toISOStringSafe(updated.completed_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
