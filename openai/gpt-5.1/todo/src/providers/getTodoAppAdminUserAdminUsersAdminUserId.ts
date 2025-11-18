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
  // Authorization for adminUser is already enforced by the AdminuserAuth decorator
  // and adminuserAuthorize provider, which validate JWT, role type, and session.
  // Here we only need to ensure the requested admin user exists and map it to DTO.

  const adminUserRecord = await MyGlobal.prisma.todo_app_adminusers.findUnique({
    where: {
      id: props.adminUserId,
    },
  });

  if (adminUserRecord === null) {
    throw new HttpException("Admin user not found", 404);
  }

  // Map Prisma model to ITodoAppAdminUser DTO, intentionally excluding password_hash.
  const result: ITodoAppAdminUser = {
    id: adminUserRecord.id,
    email: adminUserRecord.email,
    display_name:
      adminUserRecord.display_name === null
        ? null
        : adminUserRecord.display_name,
    status: adminUserRecord.status,
    created_at: toISOStringSafe(adminUserRecord.created_at),
    updated_at: toISOStringSafe(adminUserRecord.updated_at),
  };

  return result;
}
