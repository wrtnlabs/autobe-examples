import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoMemberDeactivate } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberDeactivate";
import { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function postAuthTodoMemberDeactivate(props: {
  todoMember: TodomemberPayload;
  body: ITodoListTodoMemberDeactivate.ICreate;
}): Promise<ITodoListTodoMember.ISecurity> {
  const { todoMember } = props;

  const existing = await MyGlobal.prisma.todo_list_todo_members.findFirst({
    where: {
      id: todoMember.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing === null) {
    throw new HttpException(
      "Forbidden: account not active or does not exist",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_list_todo_members.update({
    where: { id: todoMember.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    at: now,
    message: "Member account deactivated",
  };
}
