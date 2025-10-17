import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: ICommunityPortalGuest.ICreate;
}): Promise<ICommunityPortalGuest.IAuthorized> {
  const { body } = props;

  // Timestamps
  const now = toISOStringSafe(new Date());
  const guestTtlMs = 1000 * 60 * 60; // 1 hour
  const refreshTtlMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const expiredAt = toISOStringSafe(new Date(Date.now() + guestTtlMs));
  const refreshableUntil = toISOStringSafe(new Date(Date.now() + refreshTtlMs));

  // Generate a unique guest_token with limited retries
  let guest_token = v4();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await MyGlobal.prisma.community_portal_guests.findFirst({
      where: { guest_token },
    });
    if (!existing) break;
    guest_token = v4();
    attempts += 1;
  }

  const collision = await MyGlobal.prisma.community_portal_guests.findFirst({
    where: { guest_token },
  });
  if (collision)
    throw new HttpException("Failed to generate unique guest token", 500);

  // Create a lightweight server-managed guest user to satisfy schema requirement
  const userId = v4() as string & tags.Format<"uuid">;
  const userEmail = `${v4()}@guest.local`;
  const username = `guest_${userId.slice(0, 8)}`;

  let passwordHash: string;
  try {
    passwordHash = await PasswordUtil.hash(v4());
  } catch (err) {
    throw new HttpException(
      "Failed to generate credentials for guest user",
      500,
    );
  }

  const createdUser = await MyGlobal.prisma.community_portal_users.create({
    data: {
      id: userId,
      username,
      email: userEmail,
      password_hash: passwordHash,
      karma: 0,
      created_at: now,
      updated_at: now,
    },
  });

  // Create guest session
  const guestId = v4() as string & tags.Format<"uuid">;
  const createdGuest = await MyGlobal.prisma.community_portal_guests.create({
    data: {
      id: guestId,
      user_id: createdUser.id,
      guest_token,
      created_at: now,
      expired_at: expiredAt,
    },
  });

  // Issue JWT tokens
  const access = jwt.sign(
    {
      guestId: createdGuest.id,
      guest_token: createdGuest.guest_token ?? guest_token,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    { guestId: createdGuest.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };

  return {
    id: createdGuest.id,
    user_id: createdGuest.user_id,
    guest_token: createdGuest.guest_token ?? guest_token,
    created_at: now,
    expired_at: expiredAt,
    token,
  };
}
