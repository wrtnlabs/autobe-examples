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

export async function putTodoAppAdminUserAdminUsersAdminUserIdStatus(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  body: ITodoAppAdminUser.IUpdateStatus;
}): Promise<ITodoAppAdminUser> {
  const allowedStatuses: readonly string[] = [
    "active",
    "suspended",
    "disabled",
  ];

  const nextStatus = props.body.status;
  if (!allowedStatuses.includes(nextStatus)) {
    throw new HttpException("Invalid admin user status.", 400);
  }

  const existing = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
    },
  });

  if (existing === null) {
    throw new HttpException("Admin user not found.", 404);
  }

  const updated = await MyGlobal.prisma.todo_app_adminusers.update({
    where: {
      id: props.adminUserId,
    },
    data: {
      status: nextStatus,
    },
  });

  const createdAt = toISOStringSafe(updated.created_at);
  const updatedAt = toISOStringSafe(updated.updated_at);

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name === null ? null : updated.display_name,
    status: updated.status,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
