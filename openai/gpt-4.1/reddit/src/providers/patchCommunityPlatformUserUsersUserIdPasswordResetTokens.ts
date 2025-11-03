import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordResetToken";
import { IPageICommunityPlatformUserPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserPasswordResetToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserUsersUserIdPasswordResetTokens(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserPasswordResetToken.IRequest;
}): Promise<IPageICommunityPlatformUserPasswordResetToken> {
  const { user, userId, body } = props;

  // Enforce that only the owning user may access this resource
  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: you may only view your own password reset tokens",
      403,
    );
  }

  // Pagination
  const page = body.page ?? 1;
  let limit = body.limit ?? 20;
  if (limit > 100) limit = 100;

  // Compose where filters (always filter by community_platform_user_id)
  const now = toISOStringSafe(new Date());
  const where: Record<string, any> = { community_platform_user_id: userId };

  // Created_at range
  if (body.created_from !== undefined) {
    where.created_at = where.created_at ?? {};
    where.created_at.gte = body.created_from;
  }
  if (body.created_to !== undefined) {
    where.created_at = where.created_at ?? {};
    where.created_at.lte = body.created_to;
  }

  // Consumed_at range
  if (body.consumed_from !== undefined) {
    where.consumed_at = where.consumed_at ?? {};
    where.consumed_at.gte = body.consumed_from;
  }
  if (body.consumed_to !== undefined) {
    where.consumed_at = where.consumed_at ?? {};
    where.consumed_at.lte = body.consumed_to;
  }

  // Status filter logic
  if (body.status === "used") {
    where.consumed = true;
  } else if (body.status === "unused") {
    where.consumed = false;
    where.expires_at = { gte: now };
  } else if (body.status === "expired") {
    where.consumed = false;
    where.expires_at = { lt: now };
  } else if (body.status === "active") {
    where.consumed = false;
    where.expires_at = { gte: now };
  }

  // Sorting
  let orderBy: any;
  if (body.sort_by === "consumed_at") {
    orderBy = {
      consumed_at: (body.sort_order === "asc"
        ? "asc"
        : "desc") as Prisma.SortOrder,
    };
  } else {
    orderBy = {
      created_at: (body.sort_order === "asc"
        ? "asc"
        : "desc") as Prisma.SortOrder,
    };
  }

  // Query data and count (for pagination)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_password_reset_tokens.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_user_password_reset_tokens.count({
      where,
    }),
  ]);

  // Map results to DTO
  const data = rows.map((token) => ({
    id: token.id,
    community_platform_user_id: token.community_platform_user_id,
    token: token.token,
    expires_at: toISOStringSafe(token.expires_at),
    consumed: token.consumed,
    created_at: toISOStringSafe(token.created_at),
    consumed_at:
      token.consumed_at !== null && token.consumed_at !== undefined
        ? toISOStringSafe(token.consumed_at)
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
