import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: IGuest.IJoin;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // Generate UUIDs for guest id and session id
  const guestId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();

  // Current timestamp in ISO 8601 format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Access token expiry timestamp (1 hour from now)
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );

  // Refresh token expiry timestamp (7 days from now)
  const refreshableUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create JWT access token
  const access = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Create JWT refresh token
  const refresh = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: guestId,
    token: {
      access,
      refresh,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
