import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserSession.IRequest;
}): Promise<IPageICommunityPlatformUserSession.ISummary> {
  const { user, userId, body } = props;

  // Authorization: users can only view their own sessions
  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only view your own sessions.",
      403,
    );
  }

  // Check user exists
  const userExists = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: userId, deleted_at: null },
  });
  if (!userExists) {
    throw new HttpException("User not found", 404);
  }

  // Filtering
  const where: Record<string, unknown> = {
    community_platform_user_id: userId,
    ...(body.ip ? { ip: body.ip } : {}),
    ...(body.active_only ? { expired_at: null } : {}),
    ...(body.created_at_start || body.created_at_end
      ? {
          created_at: {
            ...(body.created_at_start ? { gte: body.created_at_start } : {}),
            ...(body.created_at_end ? { lte: body.created_at_end } : {}),
          },
        }
      : {}),
  };

  // Sort
  let sortBy: "created_at" | "expired_at" | "ip" = "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (
    body.sort_by &&
    ["created_at", "expired_at", "ip"].includes(body.sort_by)
  ) {
    sortBy = body.sort_by;
  }
  if (body.sort_order && ["asc", "desc"].includes(body.sort_order)) {
    sortOrder = body.sort_order;
  }

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_sessions.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_user_sessions.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    href: row.href,
    referrer: row.referrer,
    created_at: toISOStringSafe(row.created_at),
    expired_at: row.expired_at ? toISOStringSafe(row.expired_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
