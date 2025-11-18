import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserLogoutAll } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogoutAll";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postAuthMemberUserLogoutAll(props: {
  memberUser: MemberuserPayload;
}): Promise<ITodoAppMemberUserLogoutAll.IResponse> {
  // Identify the authenticated member user whose sessions must be terminated
  const memberUserId = props.memberUser.id;

  // Perform a bulk update to expire all active sessions for this member user.
  // We consider a session active when `expired_at` is null.
  const result = await MyGlobal.prisma.todo_app_memberuser_sessions.updateMany({
    where: {
      todo_app_memberuser_id: memberUserId,
      expired_at: null,
    },
    data: {
      // Prisma expects a Date for datetime fields; conversion to API string
      // happens only when returning values in DTOs, which we do not here.
      expired_at: new Date(),
    },
  });

  const affectedCount: number = result.count;

  // Build a human-readable message only when at least one session was affected.
  const message: string | null | undefined =
    affectedCount > 0
      ? `Successfully logged out from ${affectedCount} active session${
          affectedCount === 1 ? "" : "s"
        }.`
      : "No active sessions were found for this account.";

  const response: ITodoAppMemberUserLogoutAll.IResponse = {
    success: true,
    affectedSessionCount: affectedCount,
    // DTO allows message to be string | null | undefined; we always provide a string
    // for clearer UX.
    message,
  };

  return response;
}
