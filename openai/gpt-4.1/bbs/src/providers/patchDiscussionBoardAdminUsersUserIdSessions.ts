import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession> {
  const {
    user_id,
    ip,
    begin,
    end,
    active_only,
    page,
    limit,
    sort_by,
    sort_dir,
  } = props.body;
  const pageNum = page ?? 1;
  const pageSize = limit ?? 100;
  const skip = (pageNum - 1) * pageSize;

  // Build where conditions for Prisma
  const where = {
    ...(user_id !== undefined ? { user_id } : {}),
    ...(ip !== undefined ? { ip } : {}),
    ...(begin !== undefined || end !== undefined
      ? {
          created_at: {
            ...(begin !== undefined ? { gte: begin } : {}),
            ...(end !== undefined ? { lte: end } : {}),
          },
        }
      : {}),
    ...(active_only === true ? { expired_at: null } : {}),
  };

  // Sorting
  let orderBy;
  if (sort_by === "expired_at") {
    orderBy = { expired_at: sort_dir ?? "desc" };
  } else {
    orderBy = { created_at: sort_dir ?? "desc" };
  }

  // Fetch data & total count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_sessions.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: { user: true },
    }),
    MyGlobal.prisma.discussion_board_user_sessions.count({ where }),
  ]);

  // Format user summary, honoring null/undefined
  const data = sessions.map((s) => ({
    id: s.id,
    user: {
      id: s.user.id,
      email: s.user.email,
      created_at: toISOStringSafe(s.user.created_at),
      updated_at: toISOStringSafe(s.user.updated_at),
      deleted_at:
        s.user.deleted_at === null ? null : toISOStringSafe(s.user.deleted_at),
    },
    ip: s.ip,
    href: s.href,
    referrer: s.referrer,
    created_at: toISOStringSafe(s.created_at),
    expired_at: s.expired_at === null ? null : toISOStringSafe(s.expired_at),
  }));

  return {
    data,
    pagination: {
      current: pageNum satisfies number as number,
      limit: pageSize satisfies number as number,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
  };
}
