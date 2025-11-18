import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postAuthMemberUserLogout(props: {
  memberUser: MemberuserPayload;
}): Promise<ITodoAppMemberUserLogout.IResponse> {
  // Ensure we only attempt to expire sessions that belong to this member user
  // and are currently active (expired_at is null).
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_app_memberuser_sessions.updateMany({
    where: {
      id: props.memberUser.session_id,
      todo_app_memberuser_id: props.memberUser.id,
      expired_at: null,
    },
    data: {
      expired_at: now,
    },
  });

  return {
    success: true,
    message: "You have been logged out successfully.",
  };
}
