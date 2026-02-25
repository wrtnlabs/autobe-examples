import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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

export async function postCommunityPlatformAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  function getNowIsoString(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  function getFutureIsoString(ms: number): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date(Date.now() + ms));
  }
  let decodedTokenRaw: string | jwt.JwtPayload;
  try {
    decodedTokenRaw = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof decodedTokenRaw !== "object" || decodedTokenRaw === null) {
    throw new HttpException("Invalid token payload", 401);
  }
  const decodedToken = decodedTokenRaw as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: string;
    tokenType?: string;
    created_at: string & tags.Format<"date-time">;
  };
  if (decodedToken.type !== "guest" || decodedToken.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  const now = getNowIsoString();
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirst({
      where: {
        id: decodedToken.session_id,
        expired_at: { gte: now },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest =
    await MyGlobal.prisma.community_platform_guests.findUniqueOrThrow({
      where: { id: decodedToken.id },
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  const nowIsoString = getNowIsoString();
  const accessExpires = getFutureIsoString(1000 * 60 * 15);
  const refreshExpires = getFutureIsoString(1000 * 60 * 60 * 24 * 7);
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decodedToken.id,
      session_id: decodedToken.session_id,
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decodedToken.id,
      session_id: decodedToken.session_id,
      tokenType: "refresh",
      created_at: nowIsoString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.community_platform_guest_sessions.update({
    where: { id: decodedToken.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: guest.id,
    deviceFingerprint: guest.device_fingerprint,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    access: accessToken,
    refresh: refreshToken,
    accessExpiredAt: accessExpires,
    refreshExpiredAt: refreshExpires,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
