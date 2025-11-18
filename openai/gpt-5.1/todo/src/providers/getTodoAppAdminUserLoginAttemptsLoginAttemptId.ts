import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLoginAttempt";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserLoginAttemptsLoginAttemptId(props: {
  adminUser: AdminuserPayload;
  loginAttemptId: string & tags.Format<"uuid">;
}): Promise<ITodoAppLoginAttempt> {
  // Fetch the login attempt with related member and admin users for summaries
  const attempt = await MyGlobal.prisma.todo_app_login_attempts.findUnique({
    where: {
      id: props.loginAttemptId,
    },
    include: {
      memberUser: true,
      adminUser: true,
    },
  });

  if (attempt === null) {
    throw new HttpException("Login attempt not found", 404);
  }

  // Map optional member user summary if related record exists
  const memberUserSummary: ITodoAppMemberuser.ISummary | undefined =
    attempt.memberUser
      ? {
          id: attempt.memberUser.id,
          email: attempt.memberUser.email,
          display_name: attempt.memberUser.display_name ?? null,
          status: attempt.memberUser.status,
          last_login_at:
            attempt.memberUser.last_login_at !== null
              ? toISOStringSafe(attempt.memberUser.last_login_at)
              : null,
        }
      : undefined;

  // Map optional admin user summary if related record exists
  const adminUserSummary: ITodoAppAdminUser.ISummary | undefined =
    attempt.adminUser
      ? {
          id: attempt.adminUser.id,
          email: attempt.adminUser.email,
          display_name: attempt.adminUser.display_name ?? null,
          status: attempt.adminUser.status,
          last_login_at:
            attempt.adminUser.last_login_at !== null
              ? toISOStringSafe(attempt.adminUser.last_login_at)
              : null,
          created_at: toISOStringSafe(attempt.adminUser.created_at),
          updated_at: toISOStringSafe(attempt.adminUser.updated_at),
        }
      : undefined;

  const result: ITodoAppLoginAttempt = {
    id: attempt.id,
    login_identifier: attempt.login_identifier,
    actor_type: attempt.actor_type,
    succeeded: attempt.succeeded,
    ip: attempt.ip,
    user_agent: attempt.user_agent ?? null,
    failure_reason: attempt.failure_reason ?? null,
    memberUser: memberUserSummary,
    adminUser: adminUserSummary,
    created_at: toISOStringSafe(attempt.created_at),
  };

  return result;
}
