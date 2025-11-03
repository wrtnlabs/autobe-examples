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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserUsersUserIdLoginAttempts(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserLoginAttempt.IRequest;
}): Promise<IPageICommunityPlatformUserLoginAttempt.ISummary> {
  const { user, userId, body } = props;

  // Authorization: only the account owner can view their login attempts
  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: You do not have access to this user's login attempts",
      403,
    );
  }

  // Pagination: ensure valid page/limit (min 1)
  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  // Build dynamic where filter
  const where = {
    community_platform_user_id: userId,
    ...(body.from !== undefined &&
      body.from !== null && {
        attempted_at: {
          gte: body.from,
        },
      }),
    ...(body.to !== undefined &&
      body.to !== null && {
        attempted_at: Object.assign(
          {},
          body.from !== undefined && body.from !== null
            ? { gte: body.from }
            : {},
          { lte: body.to },
        ),
      }),
    ...(body.ip !== undefined &&
      body.ip !== null &&
      body.ip.length > 0 && {
        ip: { contains: body.ip },
      }),
    ...(body.success !== undefined &&
      body.success !== null && {
        success: body.success,
      }),
  };

  // Merge from/to if both are present in attempted_at
  if (
    body.from !== undefined &&
    body.from !== null &&
    body.to !== undefined &&
    body.to !== null
  ) {
    where.attempted_at = { gte: body.from, lte: body.to };
  }

  // Query matching login attempts and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_login_attempts.findMany({
      where,
      orderBy: { attempted_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_user_login_attempts.count({ where }),
  ]);

  // Map to ISummary DTOs
  const data = rows.map((row) => ({
    id: row.id,
    attempted_at: toISOStringSafe(row.attempted_at),
    ip: row.ip,
    success: row.success,
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
