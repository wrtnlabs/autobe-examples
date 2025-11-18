import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";
import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function getTodoListTodoListMemberActorsMe(props: {
  todoListMember: TodolistmemberPayload;
}): Promise<ITodoListTodolistmember> {
  const member = await MyGlobal.prisma.todo_list_todolistmembers.findUnique({
    where: { id: props.todoListMember.id },
    select: { id: true, email: true, created_at: true },
  });
  if (!member) {
    throw new HttpException("Authenticated user does not exist.", 404);
  }
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
  };
}
