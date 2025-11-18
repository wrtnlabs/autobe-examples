import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberuser> {
  const member = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: {
      id: props.memberUserId,
    },
  });

  if (member === null) {
    throw new HttpException("Member user not found", 404);
  }

  const lastLoginAt =
    member.last_login_at === null
      ? null
      : toISOStringSafe(member.last_login_at);

  const deletedAt =
    member.deleted_at === null ? null : toISOStringSafe(member.deleted_at);

  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    status: member.status,
    failed_login_count: member.failed_login_count,
    last_login_at: lastLoginAt,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: deletedAt,
  };
}
