import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserLoginAttempt";
import { IPageICommunityPlatformUserLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserLoginAttempt";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminUsersUserIdLoginAttempts(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserLoginAttempt.IRequest;
}): Promise<IPageICommunityPlatformUserLoginAttempt.ISummary> {
  const { userId, body } = props;

  // Compose WHERE filter for Prisma
  const attemptedAtFilter =
    (body.from !== undefined && body.from !== null) ||
    (body.to !== undefined && body.to !== null)
      ? {
          ...(body.from !== undefined &&
            body.from !== null && { gte: body.from }),
          ...(body.to !== undefined && body.to !== null && { lte: body.to }),
        }
      : undefined;

  const where = {
    community_platform_user_id: userId,
    ...(attemptedAtFilter !== undefined && { attempted_at: attemptedAtFilter }),
    ...(body.ip !== undefined &&
      body.ip !== null && { ip: { contains: body.ip } }),
    ...(body.success !== undefined &&
      body.success !== null && { success: body.success }),
  };

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.community_platform_user_login_attempts.count({ where }),
    MyGlobal.prisma.community_platform_user_login_attempts.findMany({
      where,
      orderBy: { attempted_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    attempted_at: toISOStringSafe(row.attempted_at),
    ip: row.ip,
    success: row.success,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
