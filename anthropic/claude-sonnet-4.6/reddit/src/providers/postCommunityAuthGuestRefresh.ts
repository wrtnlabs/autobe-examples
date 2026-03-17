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
  // 1. Verify the refresh token
  let decoded: jwt.JwtPayload;
  try {
    const result = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof result === "string" || result === null) {
      throw new HttpException("Invalid refresh token payload", 401);
    }
    decoded = result;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded["type"] !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const guestId = decoded["id"];
  if (typeof guestId !== "string") {
    throw new HttpException("Invalid token payload: missing guest id", 401);
  }
  // 3. Confirm guest record exists
  let guest: Awaited<
    ReturnType<typeof MyGlobal.prisma.community_guests.findUniqueOrThrow>
  >;
  try {
    guest = await MyGlobal.prisma.community_guests.findUniqueOrThrow({
      where: { id: guestId },
      select: {
        id: true,
        fingerprint: true,
        created_at: true,
        updated_at: true,
      },
    });
  } catch {
    throw new HttpException("Guest not found", 401);
  }
  // 4. Create a new session record
  const newSessionId = v4();
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  await MyGlobal.prisma.community_guest_sessions.create({
    data: {
      id: newSessionId,
      guest: { connect: { id: guest.id } },
      ip: "",
      href: "",
      referrer: "",
      created_at: new Date(nowMs),
      expired_at: new Date(refreshExpiresMs),
    },
  });
  // 5. Generate new tokens
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: newSessionId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: newSessionId,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return ICommunityGuest.IAuthorized
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: new Date(accessExpiresMs).toISOString(),
      refreshable_until: new Date(refreshExpiresMs).toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies ICommunityGuest.IAuthorized;
}
