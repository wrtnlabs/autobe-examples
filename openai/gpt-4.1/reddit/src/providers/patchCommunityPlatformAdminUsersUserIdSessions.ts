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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserSession.IRequest;
}): Promise<IPageICommunityPlatformUserSession.ISummary> {
  // Validate the specified user exists and is not deleted
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!user) throw new HttpException("User not found", 404);

  const body = props.body ?? {};
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Construct created_at filter range
  let createdAtRange: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.created_at_start !== undefined && body.created_at_start !== null) {
    createdAtRange.gte = body.created_at_start;
  }
  if (body.created_at_end !== undefined && body.created_at_end !== null) {
    createdAtRange.lte = body.created_at_end;
  }

  // Build where clause with filters
  const where = {
    community_platform_user_id: props.userId,
    ...(body.ip !== undefined && body.ip !== null && { ip: body.ip }),
    ...(body.active_only === true ? { expired_at: null } : {}),
    ...(Object.keys(createdAtRange).length > 0
      ? { created_at: createdAtRange }
      : {}),
  };

  // Compute sorting
  const allowedSortFields = ["created_at", "expired_at", "ip"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Define orderBy inline in the Prisma call for type safety
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_sessions.findMany({
      where,
      orderBy:
        sort_by === "expired_at"
          ? ({ expired_at: sort_order } as const)
          : sort_by === "ip"
            ? ({ ip: sort_order } as const)
            : ({ created_at: sort_order } as const),
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_user_sessions.count({ where }),
  ]);

  // Map records to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    href: row.href,
    referrer: row.referrer,
    created_at: toISOStringSafe(row.created_at),
    expired_at:
      row.expired_at !== undefined && row.expired_at !== null
        ? toISOStringSafe(row.expired_at)
        : undefined,
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
