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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditCommunityAuthGuestRefresh(props: {
  body: IRedditCommunityGuest.IRefresh;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    const verifyResult = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verifyResult === "string") throw new Error("Invalid token");
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "guest";
    }>(verifyResult);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate guest actor not deleted
  const guest = await MyGlobal.prisma.reddit_community_guests.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Validate session not expired
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_guest_id: decoded.id,
      },
    });
  const now = new Date();
  if (!session || new Date(session.expired_at) <= now) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Revoke old refresh token - Added id field with v4()
  await MyGlobal.prisma.reddit_community_token_revocations.create({
    data: {
      id: v4(), // Required by schema: String @id @db.Uuid
      jwt_token: props.body.refresh_token,
      revoked_at: toISOStringSafe(now),
      actor_type: "guest",
      expires_at: toISOStringSafe(
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      ),
      created_at: toISOStringSafe(now),
    },
  });
  // 6. Generate new tokens
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const iat = toISOStringSafe(now);
  const jti_access = v4();
  const jti_refresh = v4();
  const access = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      iat,
      jti: jti_access,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      iat,
      jti: jti_refresh,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    access,
    refresh,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
