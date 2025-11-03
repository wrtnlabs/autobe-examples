import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  // Step 1: Only allow self-service (admin can only see own sessions)
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You are only authorized to access your own session records.",
      403,
    );
  }

  const {
    page = 1,
    limit = 20,
    status,
    ip,
    orderBy = "created_at",
    orderDirection = "desc",
    search,
  } = props.body || {};
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 20 : limit;

  // Build flexible AND/OR filtering
  const where: Record<string, any> = {
    discussion_board_admin_id: props.adminId,
    ...(status === "active" ? { expired_at: null } : {}),
    ...(status === "expired" ? { NOT: { expired_at: null } } : {}),
    ...(ip ? { ip: { contains: ip } } : {}),
    ...(search
      ? {
          OR: [
            { ip: { contains: search } },
            { href: { contains: search } },
            { referrer: { contains: search } },
          ],
        }
      : {}),
  };

  // Step 2: Query paged results (order by field, direction inline)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_sessions.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    MyGlobal.prisma.discussion_board_admin_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      discussion_board_admin_id: row.discussion_board_admin_id,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: toISOStringSafe(row.created_at),
      expired_at: row.expired_at ? toISOStringSafe(row.expired_at) : undefined,
    })),
  };
}
