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
  const existingEmail = await MyGlobal.prisma.reddit_like_owners.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Generate unique username from email prefix
  const emailPrefix = props.body.email.split("@")[0];
  let username = emailPrefix;
  let usernameExists = true;
  let attempts = 0;
  while (usernameExists && attempts < 10) {
    const existingUsername = await MyGlobal.prisma.reddit_like_owners.findFirst(
      {
        where: { username },
      },
    );
    if (!existingUsername) {
      usernameExists = false;
    } else {
      username = `${emailPrefix}_${v4().substring(0, 8)}`;
      attempts++;
    }
  }
  if (usernameExists) {
    throw new HttpException("Unable to generate unique username", 500);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create owner record
  const now = new Date();
  const nowISO = now.toISOString();
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const owner = await MyGlobal.prisma.reddit_like_owners.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      username,
      display_name: props.body.nickname,
      is_active: true,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: null,
    },
  });
  // 5. Create session
  const session = await MyGlobal.prisma.reddit_like_owner_sessions.create({
    data: {
      id: v4(),
      reddit_like_owner_id: owner.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: nowISO,
      expired_at: accessExpires.toISOString(),
    },
  });
  // 6. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: session.id,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "owner",
        id: owner.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 7. Return IAuthorized with proper date conversions
  return {
    id: owner.id,
    email: owner.email,
    username: owner.username,
    display_name: owner.display_name,
    is_active: owner.is_active,
    created_at: owner.created_at.toISOString(),
    updated_at: owner.updated_at.toISOString(),
    deleted_at: owner.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IRedditLikeOwner.IAuthorized;
}
