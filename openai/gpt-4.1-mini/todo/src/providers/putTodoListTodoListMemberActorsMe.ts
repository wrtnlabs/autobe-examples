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

export async function putTodoListTodoListMemberActorsMe(props: {
  todoListMember: TodolistmemberPayload;
  body: ITodoListTodolistmember.IUpdate;
}): Promise<ITodoListTodolistmember> {
  // Step 1: Fetch current member
  const member = await MyGlobal.prisma.todo_list_todolistmembers.findUnique({
    where: { id: props.todoListMember.id },
  });
  if (!member) {
    throw new HttpException("Account not found", 404);
  }

  // Step 2: Ensure new email is unique
  const duplicate = await MyGlobal.prisma.todo_list_todolistmembers.findFirst({
    where: {
      email: props.body.email,
      NOT: { id: props.todoListMember.id },
    },
  });
  if (duplicate) {
    throw new HttpException(
      "Email is already being used by another account",
      409,
    );
  }

  // Step 3: Update only the email for the current member
  const updated = await MyGlobal.prisma.todo_list_todolistmembers.update({
    where: { id: props.todoListMember.id },
    data: {
      email: props.body.email,
    },
  });

  // Step 4: Prepare and return the API DTO with date format
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
  };
}
