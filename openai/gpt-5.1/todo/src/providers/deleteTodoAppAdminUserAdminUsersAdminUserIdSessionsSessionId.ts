import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserAdminUsersAdminUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure the target admin user exists and is active/non-deleted
  const adminUserRecord = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
      deleted_at: null,
      status: "active",
    },
  });

  if (adminUserRecord === null) {
    throw new HttpException("Admin user not found", 404);
  }

  // Locate the session ensuring it belongs to the specified admin user
  const sessionRecord =
    await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
      where: {
        id: props.sessionId,
        todo_app_adminuser_id: props.adminUserId,
      },
    });

  if (sessionRecord === null) {
    // Either the session does not exist or does not belong to this admin user
    throw new HttpException("Admin session not found", 404);
  }

  // Perform the deletion of the specific session
  await MyGlobal.prisma.todo_app_adminuser_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });

  // No content body is required on success (HTTP 204 will be handled by controller layer)
  return;
}
