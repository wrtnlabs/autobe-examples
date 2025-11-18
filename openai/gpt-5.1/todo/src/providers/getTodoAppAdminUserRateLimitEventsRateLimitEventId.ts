import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRateLimitEvent";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserRateLimitEventsRateLimitEventId(props: {
  adminUser: AdminuserPayload;
  rateLimitEventId: string & tags.Format<"uuid">;
}): Promise<ITodoAppRateLimitEvent> {
  const rateLimitEvent =
    await MyGlobal.prisma.todo_app_rate_limit_events.findUnique({
      where: {
        id: props.rateLimitEventId,
      },
      include: {
        memberUser: true,
        adminUser: true,
      },
    });

  if (rateLimitEvent === null) {
    throw new HttpException("Rate limit event not found", 404);
  }

  const memberUserSummary: ITodoAppMemberuser.ISummary | null = (() => {
    if (!rateLimitEvent.memberUser) {
      return null;
    }

    const member = rateLimitEvent.memberUser;

    return {
      id: member.id,
      email: member.email,
      display_name: member.display_name === null ? null : member.display_name,
      status: member.status,
      last_login_at:
        member.last_login_at === null
          ? null
          : toISOStringSafe(member.last_login_at),
    };
  })();

  const adminUserSummary: ITodoAppAdminUser.ISummary | null = (() => {
    if (!rateLimitEvent.adminUser) {
      return null;
    }

    const admin = rateLimitEvent.adminUser;

    return {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name === null ? null : admin.display_name,
      status: admin.status,
      last_login_at:
        admin.last_login_at === null
          ? null
          : toISOStringSafe(admin.last_login_at),
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
    };
  })();

  return {
    id: rateLimitEvent.id,
    actor_type: rateLimitEvent.actor_type,
    ip: rateLimitEvent.ip,
    limit_key: rateLimitEvent.limit_key,
    limit_type: rateLimitEvent.limit_type,
    window_start: toISOStringSafe(rateLimitEvent.window_start),
    window_end: toISOStringSafe(rateLimitEvent.window_end),
    created_at: toISOStringSafe(rateLimitEvent.created_at),
    member_user: memberUserSummary,
    admin_user: adminUserSummary,
  };
}
