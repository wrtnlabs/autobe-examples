import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoMemberRestore } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberRestore";
import { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function postAuthTodoMemberRestore(props: {
  todoMember: TodomemberPayload;
  body: ITodoListTodoMemberRestore.ICreate;
}): Promise<ITodoListTodoMember.ISecurity> {
  const { todoMember } = props;

  // Authorization: self-only operation ensured by provided payload; verify existence
  const member = await MyGlobal.prisma.todo_list_todo_members.findUnique({
    where: { id: todoMember.id },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (!member) throw new HttpException("Not Found", 404);

  const now = toISOStringSafe(new Date());

  if (member.deleted_at === null) {
    return {
      success: true,
      at: now,
      message: "Account is already active.",
    };
  }

  await MyGlobal.prisma.todo_list_todo_members.update({
    where: { id: member.id },
    data: {
      deleted_at: null,
      updated_at: now,
    },
  });

  return {
    success: true,
    at: now,
    message: "Account restored successfully.",
  };
}
