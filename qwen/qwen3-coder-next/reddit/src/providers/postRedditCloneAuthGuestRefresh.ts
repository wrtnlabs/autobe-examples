import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthGuestRefresh(props: {
  body: IRedditCloneGuest.IRefresh;
}): Promise<IRedditCloneGuest.IAuthorized> {
  // 1. Validate session exists and not expired
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.findFirst({
    where: {
      session_token: props.body.session_token,
    },
  });
  if (!session || session.expired_at <= new Date()) {
    throw new HttpException("Invalid or expired session", 401);
  }
  // 2. Generate new session token
  const newSessionToken = v4();
  // 3. Calculate expiration times
  const now = new Date();
  const newExpiredAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const newRefreshableUntil = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  // 4. Update session with new token and expiration
  await MyGlobal.prisma.reddit_clone_guest_sessions.update({
    where: { id: session.id },
    data: {
      session_token: newSessionToken,
      expired_at: newExpiredAt,
    },
  });
  // 5. Generate JWT tokens
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "guest" as const,
      id: session.guest_id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest" as const,
      id: session.guest_id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return new session details with properly formatted dates
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(newRefreshableUntil),
  };
  return {
    session_token: newSessionToken as string & tags.Format<"uuid">,
    device_id: session.device_id as string & tags.Format<"uuid">,
    expired_at: toISOStringSafe(newExpiredAt),
    token,
  };
}
