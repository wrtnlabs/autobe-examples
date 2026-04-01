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

export async function postRedditLikeAuthOwnerLogin(props: {
  ip: string;
  body: IRedditLikeOwner.ILogin;
}): Promise<IRedditLikeOwner.IAuthorized> {
  // 1. Find owner by email with password_hash explicitly selected
  const owner = await MyGlobal.prisma.reddit_like_owners.findUnique({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      display_name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (owner === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check account is active and not deleted
  if (owner.is_active === false) {
    throw new HttpException("Account is inactive", 403);
  }
  if (owner.deleted_at !== null) {
    throw new HttpException("Account has been deactivated", 403);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    owner.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new session with expiration
  const accessExpiresTimestamp = Date.now() + 60 * 60 * 1000;
  const refreshExpiresTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpires = new Date(accessExpiresTimestamp);
  const refreshExpires = new Date(refreshExpiresTimestamp);
  const session = await MyGlobal.prisma.reddit_like_owner_sessions.create({
    data: {
      id: v4(),
      reddit_like_owner_id: owner.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  // 6. Return authorized owner
  return {
    id: owner.id,
    email: owner.email,
    username: owner.username,
    display_name: owner.display_name,
    is_active: owner.is_active,
    created_at: toISOStringSafe(owner.created_at),
    updated_at: toISOStringSafe(owner.updated_at),
    deleted_at: null,
    token,
  } satisfies IRedditLikeOwner.IAuthorized;
}
