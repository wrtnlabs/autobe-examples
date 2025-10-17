import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoMemberPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberPassword";
import { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function putAuthTodoMemberPassword(props: {
  todoMember: TodomemberPayload;
  body: ITodoListTodoMemberPassword.IUpdate;
}): Promise<ITodoListTodoMember.ISecurity> {
  const { todoMember, body } = props;

  // Business requirement: both current and new passwords must be provided
  if (body.current_password === undefined || body.new_password === undefined) {
    throw new HttpException(
      "Bad Request: current_password and new_password are required",
      400,
    );
  }

  // Authorization and active account verification
  const member = await MyGlobal.prisma.todo_list_todo_members.findFirst({
    where: {
      id: todoMember.id,
      deleted_at: null,
    },
  });
  if (member === null) {
    // Either not found or deactivated
    throw new HttpException("Forbidden: Account not accessible", 403);
  }

  // Verify current password
  const ok = await PasswordUtil.verify(
    body.current_password,
    member.password_hash,
  );
  if (!ok) {
    // Neutral failure without leaking details
    throw new HttpException("Invalid current password", 400);
  }

  // Compute new password hash
  const newHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  // Persist update
  await MyGlobal.prisma.todo_list_todo_members.update({
    where: { id: member.id },
    data: {
      password_hash: newHash,
      updated_at: now,
    },
  });

  // Security confirmation response
  return {
    success: true,
    at: now,
    message: "Password changed successfully",
  };
}
