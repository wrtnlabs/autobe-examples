import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";
import { IPageICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserVerificationToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminUsersUserIdVerificationTokens(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserVerificationToken.IRequest;
}): Promise<IPageICommunityPlatformUserVerificationToken> {
  // 1. Ensure target user exists & not soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: props.userId, deleted_at: null },
    select: { id: true },
  });
  if (!user) throw new HttpException("User not found or deleted", 404);

  // 2. Pagination & filtering
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build where clause
  // status filter
  let statusFilter: Record<string, any> = {};
  const now = toISOStringSafe(new Date());
  if (props.body.status === "pending") {
    statusFilter = { consumed: false, expires_at: { gt: now } };
  } else if (props.body.status === "consumed") {
    statusFilter = { consumed: true };
  } else if (props.body.status === "expired") {
    statusFilter = { consumed: false, expires_at: { lte: now } };
  }

  // created_from / created_to filter
  let createdAtFilter: Record<string, any> = {};
  if (props.body.created_from || props.body.created_to) {
    createdAtFilter = {
      ...(props.body.created_from ? { gte: props.body.created_from } : {}),
      ...(props.body.created_to ? { lte: props.body.created_to } : {}),
    };
  }

  // Compose where
  const where = {
    community_platform_user_id: props.userId,
    ...statusFilter,
    ...(Object.keys(createdAtFilter).length > 0
      ? { created_at: createdAtFilter }
      : {}),
  };

  // 4. Query total & tokens
  const [total, tokens] = await Promise.all([
    MyGlobal.prisma.community_platform_user_verification_tokens.count({
      where,
    }),
    MyGlobal.prisma.community_platform_user_verification_tokens.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  // 5. Map tokens to DTO
  const data = tokens.map((t) => ({
    id: t.id,
    community_platform_user_id: t.community_platform_user_id,
    token: t.token,
    expires_at: toISOStringSafe(t.expires_at),
    consumed: t.consumed,
    created_at: toISOStringSafe(t.created_at),
    consumed_at: t.consumed_at ? toISOStringSafe(t.consumed_at) : undefined,
  }));

  // 6. Compose pagination
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { pagination, data };
}
