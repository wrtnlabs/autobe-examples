import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IRedditCommunityGuest.IRefresh;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 403);
  }

  if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
    throw new HttpException("Invalid token payload", 403);
  }

  const guestIdCandidate = decoded["id"];
  if (typeof guestIdCandidate !== "string") {
    throw new HttpException("Invalid token payload id", 403);
  }

  const guest = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: guestIdCandidate },
  });

  if (!guest) {
    throw new HttpException("Guest session not found", 403);
  }

  const accessTokenPayload = {
    id: guest.id,
    type: "guest",
  };

  const access = jwt.sign(accessTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshTokenPayload = {
    id: guest.id,
    type: "guest",
  };

  const refresh = jwt.sign(refreshTokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  const expired_at = toISOStringSafe(new Date(Date.now() + 3600_000));
  const refreshable_until = toISOStringSafe(new Date(Date.now() + 604_800_000));

  return {
    id: guest.id,
    session_id: guest.session_id,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent ?? null,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
