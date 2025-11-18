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

export async function postTodoAppMemberUserTodos(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const { memberUser, body } = props;

  const memberRecord = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: memberUser.id,
      status: "active",
    },
  });

  if (memberRecord === null) {
    throw new HttpException("Member user not found or not active", 403);
  }

  const nowIso = toISOStringSafe(new Date());
  const isInitiallyCompleted = body.state === "completed";

  const createdTodo = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      todo_app_memberuser_id: memberUser.id,
      title: body.title,
      description: body.description ?? null,
      state: body.state,
      due_date: body.due_date ?? null,
      created_at: nowIso,
      updated_at: nowIso,
      completed_at: isInitiallyCompleted ? nowIso : null,
      deleted_at: null,
    },
  });

  const memberSummary: ITodoAppMemberUser.ISummary = {
    id: memberRecord.id,
    email: memberRecord.email,
    display_name: memberRecord.display_name ?? null,
    status: memberRecord.status,
    created_at: toISOStringSafe(memberRecord.created_at),
  };

  const todo: ITodoAppTodo = {
    id: createdTodo.id,
    memberUser: memberSummary,
    title: createdTodo.title,
    description: createdTodo.description ?? null,
    state: createdTodo.state,
    due_date: createdTodo.due_date
      ? toISOStringSafe(createdTodo.due_date)
      : null,
    created_at: toISOStringSafe(createdTodo.created_at),
    updated_at: toISOStringSafe(createdTodo.updated_at),
    completed_at: createdTodo.completed_at
      ? toISOStringSafe(createdTodo.completed_at)
      : null,
    deleted_at: createdTodo.deleted_at
      ? toISOStringSafe(createdTodo.deleted_at)
      : null,
  };

  return todo;
}
