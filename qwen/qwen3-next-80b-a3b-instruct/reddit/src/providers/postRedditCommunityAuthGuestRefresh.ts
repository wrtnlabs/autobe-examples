import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthGuestRefresh(props: {
  body: IRedditCommunityGuest.IRefresh;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "redditCommunity",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        guest_id: decoded.id,
      },
    });
  if (
    !session ||
    toISOStringSafe(session.expired_at) <= toISOStringSafe(new Date())
  ) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate guest account is active
  const guest = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest) {
    throw new HttpException(
      "Guest account does not exist or has been deleted",
      401,
    );
  }
  // 4. Generate new tokens using current epoch time as base
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "guest",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "redditCommunity" },
  );
  const refreshToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "guest",
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "redditCommunity" },
  );
  // 5. Update session expiration
  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires as string & tags.Format<"date-time">,
      refreshable_until: refreshExpires as string & tags.Format<"date-time">,
    },
  };
}
