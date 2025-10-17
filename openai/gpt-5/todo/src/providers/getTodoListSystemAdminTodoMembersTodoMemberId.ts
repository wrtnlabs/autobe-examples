import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getTodoListSystemAdminTodoMembersTodoMemberId(props: {
  systemAdmin: SystemadminPayload;
  todoMemberId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodoMember> {
  const { systemAdmin, todoMemberId } = props;

  // Authorization: ensure the system admin exists and is active
  const admin = await MyGlobal.prisma.todo_list_system_admins.findFirst({
    where: {
      id: systemAdmin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!admin) throw new HttpException("Forbidden", 403);

  // Fetch the member by ID (admin can view even if deactivated)
  const member = await MyGlobal.prisma.todo_list_todo_members.findUnique({
    where: { id: todoMemberId },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!member) throw new HttpException("Not Found", 404);

  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
