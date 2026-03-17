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
import { RedditLikeOwnerTransformer } from "../transformers/RedditLikeOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthOwnerLogin(props: {
  ip: string;
  body: IRedditLikeOwner.ILogin;
}): Promise<IRedditLikeOwner.IAuthorized> {
  // 1. Find owner by email with password_hash explicitly included
  const owner = await MyGlobal.prisma.reddit_like_owners.findFirst({
    where: { email: props.body.email },
    select: {
      ...RedditLikeOwnerTransformer.select().select,
      password_hash: true,
    },
  });
  // 2. Verify owner exists
  if (!owner) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify account is active and not deleted
  if (!owner.is_active || owner.deleted_at !== null) {
    throw new HttpException("Account is inactive or deleted", 403);
  }
  // 4. Verify password using PasswordUtil
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Calculate token expiration times
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const nowISO = toISOStringSafe(now);
  const accessExpiresISO = toISOStringSafe(accessExpiresAt);
  const refreshExpiresISO = toISOStringSafe(refreshExpiresAt);
  // 6. Create new session
  const sessionId = v4();
  await MyGlobal.prisma.reddit_like_owner_sessions.create({
    data: {
      id: sessionId,
      reddit_like_owner_id: owner.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowISO,
      expired_at: accessExpiresISO,
    },
  });
  // 7. Generate JWT tokens
  const tokenPayload = {
    type: "owner",
    id: owner.id,
    session_id: sessionId,
    created_at: nowISO,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };
  // 8. Transform owner and return authorized response
  const ownerDto = await RedditLikeOwnerTransformer.transform(owner);
  return {
    ...ownerDto,
    token,
  };
}
