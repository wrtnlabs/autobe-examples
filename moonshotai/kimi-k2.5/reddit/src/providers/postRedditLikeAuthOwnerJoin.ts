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

export async function postRedditLikeAuthOwnerJoin(props: {
  ip: string;
  body: IRedditLikeOwner.IJoin;
}): Promise<IRedditLikeOwner.IAuthorized> {
  // 1. Check for duplicate email
  const existingOwner = await MyGlobal.prisma.reddit_like_owners.findFirst({
    where: { email: props.body.email },
  });
  if (existingOwner) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate username from email prefix
  const username = props.body.email.split("@")[0] ?? props.body.email;
  // Check username uniqueness
  const existingUsername = await MyGlobal.prisma.reddit_like_owners.findFirst({
    where: { username },
  });
  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }
  // 2. Create owner
  const ownerId = v4();
  const now = new Date();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const owner = await MyGlobal.prisma.reddit_like_owners.create({
    data: {
      id: ownerId,
      email: props.body.email,
      password_hash: passwordHash,
      username: username,
      display_name: props.body.nickname,
      is_active: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create session
  const sessionId = v4();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await MyGlobal.prisma.reddit_like_owner_sessions.create({
    data: {
      id: sessionId,
      reddit_like_owner_id: ownerId,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "owner",
        id: ownerId,
        session_id: sessionId,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "owner",
        id: ownerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  return {
    id: ownerId,
    email: props.body.email,
    username: username,
    display_name: props.body.nickname,
    is_active: true,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
    deleted_at: null,
    token,
  };
}
