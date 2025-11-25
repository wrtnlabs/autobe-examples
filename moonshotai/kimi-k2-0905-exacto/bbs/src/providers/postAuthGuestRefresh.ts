import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: IEconomicDiscussionGuest.IRefresh;
}): Promise<IEconomicDiscussionGuest.IAuthorized> {
  // Find the guest by ID
  const guest = await MyGlobal.prisma.economic_discussion_guests.findUnique({
    where: { id: props.body.id },
  });

  if (!guest) {
    throw new HttpException("Guest session not found", 404);
  }

  // Generate new tokens with same session_id
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const currentTime: Date = new Date();

  const accessToken: string = jwt.sign(
    {
      id: guest.id,
      session_id: guest.id,
      type: "guest",
      created_at: toISOStringSafe(currentTime),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken: string = jwt.sign(
    {
      id: guest.id,
      session_id: guest.id,
      type: "guest",
      tokenType: "refresh",
      created_at: toISOStringSafe(currentTime),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update guest last activity
  await MyGlobal.prisma.economic_discussion_guests.update({
    where: { id: guest.id },
    data: {
      last_activity_at: currentTime,
    },
  });

  return {
    id: guest.id,
    username: guest.username,
    created_at: toISOStringSafe(guest.created_at),
    last_activity_at: toISOStringSafe(currentTime),
    articles_viewed_count: guest.articles_viewed_count,
    downloads_count: guest.downloads_count,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
