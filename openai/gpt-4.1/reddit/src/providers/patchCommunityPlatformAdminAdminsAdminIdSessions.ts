import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import { IPageICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdminSession.IRequest;
}): Promise<IPageICommunityPlatformAdminSession> {
  // Authorization: Only allow the authenticated admin to query their own sessions
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You may only view your own admin sessions.",
      403,
    );
  }

  const page = Number(props.body.page);
  const limit = Number(props.body.limit);
  const skip = (page - 1) * limit;
  const nowStr = toISOStringSafe(new Date());

  let where: Record<string, unknown> = {
    community_platform_admin_id: props.adminId,
  };

  // Add optional filters
  if (props.body.ip !== undefined && props.body.ip !== null) {
    where.ip = props.body.ip;
  }

  // Status filter
  if (props.body.status === "active") {
    where = {
      ...where,
      OR: [{ expired_at: null }, { expired_at: { gt: nowStr } }],
    };
  } else if (
    props.body.status === "expired" ||
    props.body.status === "revoked"
  ) {
    // All expired sessions (expired_at not null and <= now)
    where = {
      ...where,
      expired_at: { lte: nowStr },
    };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admin_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_admin_sessions.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    community_platform_admin_id: row.community_platform_admin_id,
    ip: row.ip,
    href: row.href,
    referrer: row.referrer,
    created_at: toISOStringSafe(row.created_at),
    expired_at:
      row.expired_at === null ? null : toISOStringSafe(row.expired_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
