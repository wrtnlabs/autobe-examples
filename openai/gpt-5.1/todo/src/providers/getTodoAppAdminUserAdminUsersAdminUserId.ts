import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdminUser> {
  const record = await MyGlobal.prisma.todo_app_adminusers.findUnique({
    where: { id: props.adminUserId },
  });

  if (record === null || record.deleted_at !== null) {
    throw new HttpException("Admin user not found", 404);
  }

  return {
    id: record.id,
    email: record.email,
    display_name: record.display_name === null ? null : record.display_name,
    status: record.status,
    failed_login_count: record.failed_login_count,
    last_login_at:
      record.last_login_at === null
        ? null
        : toISOStringSafe(record.last_login_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
