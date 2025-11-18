import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Prevent currently authenticated admin from deleting their own account
  if (props.adminUser.id === props.adminUserId) {
    throw new HttpException(
      "Authenticated admin user cannot delete their own account",
      403,
    );
  }

  const existingAdminUser =
    await MyGlobal.prisma.todo_app_adminusers.findUnique({
      where: {
        id: props.adminUserId,
      },
    });

  if (existingAdminUser === null) {
    throw new HttpException("Admin user not found", 404);
  }

  await MyGlobal.prisma.todo_app_adminusers.delete({
    where: {
      id: props.adminUserId,
    },
  });
}
