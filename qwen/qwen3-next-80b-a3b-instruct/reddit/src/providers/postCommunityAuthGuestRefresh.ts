import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
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

export async function postCommunityAuthGuestRefresh(props: {
  body: ICommunityGuest.IRefresh;
}): Promise<ICommunityGuest.IAuthorized> {
  // 1. Find active JWT signing key from crypto_keys
  const key = await MyGlobal.prisma.community_crypto_keys.findFirst({
    where: {
      key_type: "jwt-signing",
      algorithm: "RS256",
      status: "active",
      deleted_at: null,
    },
  });
  if (!key) throw new HttpException("Authentication system unavailable", 503);
  // 2. Extract refresh token from Authorization header through MyGlobal.context
  const authHeader = MyGlobal.context.request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const refreshToken = authHeader.substring(7);
  // 3. Verify refresh token signature using the key
  let decoded: {
    guest_id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(refreshToken, key.key_value, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 4. Validate session existence and non-expiration
  const session = await MyGlobal.prisma.community_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      community_guest_id: decoded.guest_id,
    },
  });
  if (!session) throw new HttpException("Session not found", 401);
  // Compare expired_at as string dates to avoid Date object issues
  // Convert expired_at to ISO string for comparison
  if (session.expired_at <= new Date().toISOString())
    throw new HttpException("Session expired", 401);
  // 5. Validate guest is not deleted
  const guest = await MyGlobal.prisma.community_guests.findUnique({
    where: { id: decoded.guest_id },
  });
  if (!guest || guest.deleted_at !== null)
    throw new HttpException("Guest account invalid or deleted", 403);
  // 6. Generate new tokens
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      guest_id: decoded.guest_id,
      session_id: decoded.session_id,
      created_at: now,
    },
    key.key_value,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      guest_id: decoded.guest_id,
      session_id: decoded.session_id,
      created_at: now,
    },
    key.key_value,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: accessExpires },
  });
  return {
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
