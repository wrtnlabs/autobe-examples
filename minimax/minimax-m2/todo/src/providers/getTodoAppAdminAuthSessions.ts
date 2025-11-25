import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuthSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthSession";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuthSessions(props: {
  admin: AdminPayload;
}): Promise<IPageIAuthSession> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Query member sessions with user data
  const memberSessions =
    await MyGlobal.prisma.todo_app_member_sessions.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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

  // Query administrator sessions with user data
  const adminSessions =
    await MyGlobal.prisma.todo_app_administrator_sessions.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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

  // Transform member sessions to unified format
  const memberAuthSessions: IAuthSession[] = memberSessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    user: {
      id: session.member.id as string & tags.Format<"uuid">,
      email: session.member.email,
      first_name: session.member.first_name ?? undefined,
      last_name: session.member.last_name ?? undefined,
      status: session.member.status,
    },
    user_type: "member" as const,
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer as string & tags.Format<"uri">,
    created_at: toISOStringSafe(session.created_at),
  }));

  // Transform administrator sessions to unified format
  const adminAuthSessions: IAuthSession[] = adminSessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    user: {
      id: session.administrator.id as string & tags.Format<"uuid">,
      email: session.administrator.email,
      first_name: session.administrator.first_name ?? undefined,
      last_name: session.administrator.last_name ?? undefined,
      status: session.administrator.status,
    },
    user_type: "administrator" as const,
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer as string & tags.Format<"uri">,
    created_at: toISOStringSafe(session.created_at),
  }));

  // Combine and sort by creation date
  const allSessions = [...memberAuthSessions, ...adminAuthSessions].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Get total count from both tables
  const [memberTotal, adminTotal] = await Promise.all([
    MyGlobal.prisma.todo_app_member_sessions.count(),
    MyGlobal.prisma.todo_app_administrator_sessions.count(),
  ]);

  const total = memberTotal + adminTotal;

  return {
    data: allSessions.slice(0, limit),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
