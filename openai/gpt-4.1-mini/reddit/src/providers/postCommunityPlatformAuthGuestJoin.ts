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

export async function postCommunityPlatformAuthGuestJoin(props: {
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const existing = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: {
      device_fingerprint: props.body.deviceFingerprint,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  const id: string & tags.Format<"uuid"> = v4();
  const nowIso: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.community_platform_guests.create({
    data: {
      id,
      device_fingerprint: props.body.deviceFingerprint,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
  });
  const accessExpiredAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpiredAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const accessTokenPayload = {
    type: "guest",
    id,
    session_id: id,
    created_at: nowIso,
  };
  const access = jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refreshTokenPayload = {
    type: "guest",
    id,
    session_id: id,
    tokenType: "refresh",
    created_at: nowIso,
  };
  const refresh = jwt.sign(refreshTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };
  return {
    id,
    deviceFingerprint: props.body.deviceFingerprint,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    access,
    refresh,
    accessExpiredAt,
    refreshExpiredAt,
    token,
  };
}
