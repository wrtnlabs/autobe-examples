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
import { CommunityPlatformGuestTransformer } from "../transformers/CommunityPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const now = new Date();
  let verified: unknown;
  try {
    verified = jwt.verify(
      String(props.body.refresh),
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof verified !== "object" || verified === null) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const verifiedType = Reflect.get(verified, "type");
  const verifiedId = Reflect.get(verified, "id");
  const verifiedSessionId = Reflect.get(verified, "session_id");
  if (verifiedType !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  if (typeof verifiedId !== "string" || typeof verifiedSessionId !== "string") {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirst({
      where: {
        id: verifiedSessionId,
        community_platform_guest_id: verifiedId,
        expired_at: { gt: now },
      },
      select: {
        id: true,
        community_platform_guest_id: true,
        ip: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest =
    await MyGlobal.prisma.community_platform_guests.findUniqueOrThrow({
      where: { id: verifiedId },
      ...CommunityPlatformGuestTransformer.select(),
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest identity has been retired", 403);
  }
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const createdAt = now.toISOString();
  const access = jwt.sign(
    {
      type: "guest",
      id: verifiedId,
      session_id: verifiedSessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: verifiedId,
      session_id: verifiedSessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.community_platform_guest_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshableUntil,
      ip: props.body.ip ?? session.ip,
      href: props.body.href,
      referrer: props.body.referrer,
    },
  });
  return {
    ...(await CommunityPlatformGuestTransformer.transform(guest)),
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt.toISOString(),
      refreshable_until: refreshableUntil.toISOString(),
    },
  };
}
