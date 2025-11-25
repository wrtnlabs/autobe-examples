import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Verify that the target admin user exists.
  const targetAdminUser = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
    },
  });

  if (targetAdminUser === null) {
    throw new HttpException("Admin user not found", 404);
  }

  // Ensure that the session exists and belongs to the specified admin user.
  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_adminuser_id: props.adminUserId,
    },
  });

  if (session === null) {
    throw new HttpException("Admin session not found", 404);
  }

  // Authorization policy: any authenticated adminUser can revoke sessions
  // for any admin account. The adminUser payload has already been validated
  // by the authorization layer, so at this point we only enforce that the
  // targeted session belongs to the provided adminUserId path parameter.

  await MyGlobal.prisma.todo_app_adminuser_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
