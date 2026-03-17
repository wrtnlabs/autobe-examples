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
  const decoded: {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as unknown as {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and belongs to the same guest
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
  // 4. Calculate new expiration times
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 5. Generate new tokens (SAME session_id for continuity)
  const access_token: string = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh_token: string = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      updated_at: new Date(),
      expired_at: new Date(refreshExpires),
    },
  });
  // 7. Return response
  return {
    id: decoded.id,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
