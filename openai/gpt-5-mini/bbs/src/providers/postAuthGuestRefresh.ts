import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IEconPoliticalForumGuest.IRefresh;
}): Promise<IEconPoliticalForumGuest.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
  let decodedToken: unknown;
  try {
    decodedToken = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_err) {
    throw new HttpException("Invalid refresh token", 401);
  }

  if (typeof decodedToken !== "object" || decodedToken === null) {
    throw new HttpException("Invalid refresh token payload", 401);
  }

  // Extract expected fields from token payload
  // Accept common shapes: { id, type, tokenType }
  const payloadAny = decodedToken as { [key: string]: unknown };
  const tokenType = (payloadAny["tokenType"] ?? payloadAny["token_type"]) as
    | string
    | undefined;
  const subjectId = (payloadAny["id"] ??
    payloadAny["userId"] ??
    payloadAny["guestId"]) as string | undefined;
  const subjectType = (payloadAny["type"] ?? payloadAny["sub_type"]) as
    | string
    | undefined;

  if (!subjectId || typeof subjectId !== "string") {
    throw new HttpException(
      "Invalid refresh token payload: missing subject id",
      401,
    );
  }

  if (subjectType !== "guest") {
    throw new HttpException("Invalid token role", 401);
  }

  if (tokenType !== "refresh") {
    throw new HttpException("Token is not a refresh token", 401);
  }

  // Step 2: Confirm guest record exists and is active (deleted_at == null)
  const guestRecord =
    await MyGlobal.prisma.econ_political_forum_guest.findUnique({
      where: { id: subjectId },
      select: { id: true, nickname: true, deleted_at: true },
    });

  if (!guestRecord || guestRecord.deleted_at !== null) {
    throw new HttpException("Guest not found or revoked", 403);
  }

  // Optional: update last-seen/updated_at timestamp
  const now = toISOStringSafe(new Date());
  try {
    await MyGlobal.prisma.econ_political_forum_guest.update({
      where: { id: guestRecord.id },
      data: { updated_at: now },
    });
  } catch (_e) {
    // Non-fatal: if update fails, continue to issue tokens; do not expose DB error
  }

  // Step 3: Issue new tokens (rotate refresh token)
  const accessLifetimeSeconds = 15 * 60; // 15 minutes
  const refreshLifetimeSeconds = 7 * 24 * 60 * 60; // 7 days

  const accessToken = jwt.sign(
    {
      id: guestRecord.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: `${accessLifetimeSeconds}s` },
  );

  const rotatedRefreshToken = jwt.sign(
    {
      id: guestRecord.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: `${refreshLifetimeSeconds}s` },
  );

  const expiredAt = toISOStringSafe(
    new Date(Date.now() + accessLifetimeSeconds * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshLifetimeSeconds * 1000),
  );

  return {
    id: guestRecord.id,
    nickname: guestRecord.nickname ?? undefined,
    token: {
      access: accessToken,
      refresh: rotatedRefreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
