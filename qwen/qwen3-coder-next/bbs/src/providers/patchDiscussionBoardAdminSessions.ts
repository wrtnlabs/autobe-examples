import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSessions(): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const sessions =
    await MyGlobal.prisma.discussion_board_admin_sessions.findMany({
      where: {},
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        ip: true,
        href: true,
        created_at: true,
        expired_at: true,
        discussion_board_admin_id: true,
      },
    });
  const total = await MyGlobal.prisma.discussion_board_admin_sessions.count({
    where: {},
  });
  const adminSessions = await Promise.all(
    sessions.map(async (session) => {
      const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: session.discussion_board_admin_id },
      });
      const adminData = admin
        ? {
            id: session.id,
            ip: session.ip,
            href: session.href,
            created_at: toISOStringSafe(session.created_at),
            expired_at: toISOStringSafe(session.expired_at),
            admin: {
              id: admin.id,
              display_name: admin.display_name,
              email: admin.email,
              is_super_admin: admin.is_super_admin,
              is_active: admin.is_active,
              created_at: toISOStringSafe(admin.created_at),
              updated_at: toISOStringSafe(admin.updated_at),
              deleted_at: admin.deleted_at
                ? toISOStringSafe(admin.deleted_at)
                : null,
            },
          }
        : {
            id: session.id,
            ip: session.ip,
            href: session.href,
            created_at: toISOStringSafe(session.created_at),
            expired_at: toISOStringSafe(session.expired_at),
            admin: {
              id: "",
              display_name: "Unknown Admin",
              email: "unknown@example.com",
              is_super_admin: false,
              is_active: false,
              created_at: toISOStringSafe(new Date()),
              updated_at: toISOStringSafe(new Date()),
              deleted_at: null,
            },
          };
      return adminData;
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: adminSessions,
  };
}
