import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberUser> {
  const existing = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: {
      id: props.memberUserId,
    },
  });

  if (existing === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Delete all related todos and then the member user itself in a single transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_todos.deleteMany({
      where: {
        todo_app_memberuser_id: props.memberUserId,
      },
    }),
    MyGlobal.prisma.todo_app_memberusers.delete({
      where: {
        id: props.memberUserId,
      },
    }),
  ]);

  const displayNameValue =
    existing.display_name === null ? null : existing.display_name;

  return {
    id: existing.id,
    email: existing.email,
    display_name: displayNameValue,
    status: existing.status,
    created_at: toISOStringSafe(existing.created_at),
    updated_at: toISOStringSafe(existing.updated_at),
  };
}
