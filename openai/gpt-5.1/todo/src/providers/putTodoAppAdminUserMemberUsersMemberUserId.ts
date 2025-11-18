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

export async function putTodoAppAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string;
  body: ITodoAppMemberuser.IUpdate;
}): Promise<ITodoAppMemberuser> {
  // Verify that the target member user exists and is not soft-deleted
  const existing = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUserId,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Member user not found", 404);
  }

  const body = props.body;

  const updated = await MyGlobal.prisma.todo_app_memberusers.update({
    where: { id: props.memberUserId },
    data: {
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.display_name !== undefined
        ? { display_name: body.display_name }
        : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.failed_login_count !== undefined
        ? { failed_login_count: body.failed_login_count }
        : {}),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name === null ? null : updated.display_name,
    status: updated.status,
    failed_login_count: updated.failed_login_count,
    last_login_at:
      updated.last_login_at !== null
        ? toISOStringSafe(updated.last_login_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
