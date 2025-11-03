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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminUsersUserIdPasswordResetTokens(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserPasswordResetToken.IRequest;
}): Promise<IPageICommunityPlatformUserPasswordResetToken> {
  const { userId, body } = props;

  // 1. Ensure the user exists and is not soft deleted
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: userId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  // 2. Build where clause with all filters (immutable, no mutation)
  const now = toISOStringSafe(new Date());
  const statusFilters = (() => {
    if (body.status === "used") return { consumed: true };
    if (body.status === "unused") return { consumed: false };
    if (body.status === "expired")
      return { consumed: false, expires_at: { lt: now } };
    if (body.status === "active")
      return { consumed: false, expires_at: { gt: now } };
    return {};
  })();
  const where = {
    community_platform_user_id: userId,
    ...statusFilters,
    ...(body.created_from && { created_at: { gte: body.created_from } }),
    ...(body.created_to && {
      created_at: {
        ...((body.created_from && { gte: body.created_from }) || {}),
        lte: body.created_to,
      },
    }),
    ...(body.consumed_from && { consumed_at: { gte: body.consumed_from } }),
    ...(body.consumed_to && {
      consumed_at: {
        ...((body.consumed_from && { gte: body.consumed_from }) || {}),
        lte: body.consumed_to,
      },
    }),
  };

  // 3. Pagination (typia tags compatible)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Sorting
  const sortField =
    body.sort_by === "consumed_at" ? "consumed_at" : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // 5. Prisma queries (never extract where/orderBy, no intermediate variables)
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_password_reset_tokens.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_user_password_reset_tokens.count({
      where,
    }),
  ]);

  // 6. Map to response DTO - convert all dates, set consumed_at undefined if null
  const data = records.map((token) => ({
    id: token.id,
    community_platform_user_id: token.community_platform_user_id,
    token: token.token,
    expires_at: toISOStringSafe(token.expires_at),
    consumed: token.consumed,
    created_at: toISOStringSafe(token.created_at),
    ...(token.consumed_at === null
      ? {}
      : { consumed_at: toISOStringSafe(token.consumed_at) }),
  }));

  // 7. Pagination object (use Number() for typia tags)
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
