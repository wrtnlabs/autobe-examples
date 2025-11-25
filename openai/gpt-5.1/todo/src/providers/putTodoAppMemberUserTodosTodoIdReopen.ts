import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putTodoAppMemberUserTodosTodoIdReopen(props: {
  memberUser: MemberuserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: props.memberUser.id,
    },
    include: {
      memberUser: true,
    },
  });

  if (existing === null) {
    throw new HttpException("Todo not found", 404);
  }

  if (existing.state === "active" && existing.deleted_at === null) {
    const member = existing.memberUser;

    return {
      id: existing.id,
      memberUser: {
        id: member.id,
        email: member.email,
        display_name: member.display_name ?? null,
        status: member.status,
        created_at: toISOStringSafe(member.created_at),
      },
      title: existing.title,
      description: existing.description ?? null,
      state: existing.state,
      due_date:
        existing.due_date !== null ? toISOStringSafe(existing.due_date) : null,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
      completed_at:
        existing.completed_at !== null
          ? toISOStringSafe(existing.completed_at)
          : null,
      deleted_at:
        existing.deleted_at !== null
          ? toISOStringSafe(existing.deleted_at)
          : null,
    };
  }

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: props.todoId,
    },
    data: {
      state: "active",
      deleted_at: null,
      completed_at: null,
    },
    include: {
      memberUser: true,
    },
  });

  const member = updated.memberUser;

  return {
    id: updated.id,
    memberUser: {
      id: member.id,
      email: member.email,
      display_name: member.display_name ?? null,
      status: member.status,
      created_at: toISOStringSafe(member.created_at),
    },
    title: updated.title,
    description: updated.description ?? null,
    state: updated.state,
    due_date:
      updated.due_date !== null ? toISOStringSafe(updated.due_date) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at !== null
        ? toISOStringSafe(updated.completed_at)
        : null,
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
