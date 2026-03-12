import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberLogin(props: {
  ip: string;
  body: IRedditCloneMember.ILogin;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_uri: true,
      karma: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Calculate expiration timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: v4(),
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: v4(),
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create new session
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: v4(),
      reddit_clone_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: null,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 6. Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar_uri: member.avatar_uri,
    karma: member.karma,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IRedditCloneMember.IAuthorized;
}
