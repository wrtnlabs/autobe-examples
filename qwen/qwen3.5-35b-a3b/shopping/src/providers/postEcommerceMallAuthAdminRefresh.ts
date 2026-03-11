import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthAdminRefresh(props: {
  body: IEcommerceMallAdmin.IRefresh;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Verify refresh token signature
  const verifyResult = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof verifyResult !== "object" || verifyResult === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const decoded = verifyResult as {
    id: string;
    session_id: string;
    type: string;
  };
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session has not expired
  if (toISOStringSafe(session.expired_at) < toISOStringSafe(new Date())) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate admin exists and is not banned
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (admin.is_banned) {
    throw new HttpException("Account has been banned", 403);
  }
  // 6. Generate new tokens (reuse same session_id for session continuity)
  const currentTime = toISOStringSafe(new Date());
  const accessExpiration = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiration = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newAccessTokenPayload = {
    type: "admin" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: currentTime,
  };
  const newAccessToken = jwt.sign(
    newAccessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshTokenPayload = {
    type: "admin" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    tokenType: "refresh" as const,
    created_at: currentTime,
  };
  const newRefreshToken = jwt.sign(
    newRefreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration to extend session
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiration),
    },
  });
  // 8. Build and return authorized response
  const response: IEcommerceMallAdmin.IAuthorized = {
    id: admin.id,
    email: admin.email,
    isBanned: admin.is_banned,
    banReason: admin.ban_reason,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiration,
      refreshable_until: refreshExpiration,
    },
  };
  return response;
}
