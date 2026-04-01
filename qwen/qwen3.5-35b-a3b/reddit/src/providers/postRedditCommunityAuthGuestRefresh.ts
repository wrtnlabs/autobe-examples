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
  // 1. Verify refresh token is valid JWT
  const decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
    created_at: string & tags.Format<"date-time">;
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as unknown as typeof decoded;
  // 2. Validate session exists and belongs to this guest
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_guest_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate session is not expired
  const sessionExpiredAt: string & tags.Format<"date-time"> =
    session.expired_at.toISOString();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  if (now > sessionExpiredAt) {
    throw new HttpException("Session expired", 401);
  }
  // 4. Validate guest exists and is not deleted
  await MyGlobal.prisma.reddit_community_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new tokens with same session_id
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const nowIso: string & tags.Format<"date-time"> = new Date().toISOString();
  const access: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new expiration time
  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpires),
      updated_at: new Date(),
    },
  });
  // 7. Return authorized response
  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
