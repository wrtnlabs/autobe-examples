import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthOwnerRefresh(props: {
  body: IRedditLikeOwner.IRefresh;
}): Promise<IRedditLikeOwner.IAuthorized> {
  interface ITokenPayload {
    id: string;
    session_id: string;
    type: string;
  }
  // 1. Verify refresh token
  let decoded: ITokenPayload;
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as ITokenPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "owner") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.reddit_like_owner_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_like_owner_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate owner is active and not deleted
  const owner = await MyGlobal.prisma.reddit_like_owners.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (!owner.is_active || owner.deleted_at !== null) {
    throw new HttpException("Account is inactive or deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "owner",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "owner",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_like_owner_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return owner profile with new tokens
  const authorized: IRedditLikeOwner.IAuthorized = {
    id: owner.id,
    email: owner.email,
    username: owner.username,
    display_name: owner.display_name,
    is_active: owner.is_active,
    created_at: toISOStringSafe(owner.created_at),
    updated_at: toISOStringSafe(owner.updated_at),
    deleted_at: null, // owner.deleted_at is guaranteed to be null here due to earlier check
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
  return authorized;
}
