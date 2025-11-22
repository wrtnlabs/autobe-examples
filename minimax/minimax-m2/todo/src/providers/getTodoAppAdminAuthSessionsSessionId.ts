import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthSession";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuthSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IAuthSession> {
  // Try to find session in member_sessions first
  const memberSession =
    await MyGlobal.prisma.todo_app_member_sessions.findUnique({
      where: { id: props.sessionId },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            status: true,
          },
        },
      },
    });

  if (memberSession) {
    return {
      id: memberSession.id,
      user: {
        id: memberSession.member.id,
        email: memberSession.member.email,
        first_name: memberSession.member.first_name ?? undefined,
        last_name: memberSession.member.last_name ?? undefined,
        status: memberSession.member.status,
      },
      user_type: "member" as const,
      ip: memberSession.ip,
      href: memberSession.href,
      referrer: memberSession.referrer,
      created_at: toISOStringSafe(memberSession.created_at),
    };
  }

  // Try to find session in administrator_sessions
  const adminSession =
    await MyGlobal.prisma.todo_app_administrator_sessions.findUnique({
      where: { id: props.sessionId },
      include: {
        administrator: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            status: true,
          },
        },
      },
    });

  if (adminSession) {
    return {
      id: adminSession.id,
      user: {
        id: adminSession.administrator.id,
        email: adminSession.administrator.email,
        first_name: adminSession.administrator.first_name ?? undefined,
        last_name: adminSession.administrator.last_name ?? undefined,
        status: adminSession.administrator.status,
      },
      user_type: "administrator" as const,
      ip: adminSession.ip,
      href: adminSession.href,
      referrer: adminSession.referrer,
      created_at: toISOStringSafe(adminSession.created_at),
    };
  }

  // Session not found in either table
  throw new HttpException("Session not found", 404);
}
