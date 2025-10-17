import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: ICommunityPlatformModerator.IRefresh;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // 1. Extract the refresh token from Authorization header (Bearer) or fail
  const req: any =
    (MyGlobal as any).request || (MyGlobal as any).context?.request;
  const authHeader = req?.headers?.authorization ?? req?.headers?.Authorization;
  if (
    !authHeader ||
    typeof authHeader !== "string" ||
    !authHeader.toLowerCase().startsWith("bearer ")
  ) {
    throw new HttpException("Unauthorized", 401);
  }
  const refreshToken = authHeader.slice(7).trim();

  // 2. Verify refresh token (must be signed by us; type = moderator-refresh)
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Unauthorized", 401);
  }

  // Validate moderator JWT structure
  if (!payload || payload.type !== "moderator" || !payload.id) {
    throw new HttpException("Unauthorized", 401);
  }

  // 3. Find moderator record (not deleted, status active)
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: payload.id },
    });
  if (
    !moderator ||
    moderator.deleted_at !== null ||
    moderator.status !== "active"
  ) {
    throw new HttpException("Unauthorized", 401);
  }

  // 4. Compose new JWTs with identical payload structure
  const nowNum = Date.now();
  const accessExpires = new Date(nowNum + 1 * 60 * 60 * 1000); // 1h
  const refreshExpires = new Date(nowNum + 7 * 24 * 60 * 60 * 1000); // 7d

  // JWT payload contract for access/refresh
  const jwtPayload = {
    id: moderator.id,
    member_id: moderator.member_id,
    community_id: moderator.community_id,
    type: "moderator",
  };

  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // 5. Prepare result: return all required info
  return {
    id: moderator.id,
    member_id: moderator.member_id,
    community_id: moderator.community_id,
    email: moderator.email,
    status: moderator.status,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at:
      moderator.deleted_at !== null && moderator.deleted_at !== undefined
        ? toISOStringSafe(moderator.deleted_at)
        : undefined,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
