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
import { RedditCloneMemberTransformer } from "../transformers/RedditCloneMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberJoin(props: {
  ip: string;
  body: IRedditCloneMember.IJoin;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Check duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_clone_members.findFirst(
    {
      where: {
        username: props.body.username,
        deleted_at: null,
      },
    },
  );
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create member
  const now = new Date();
  const member = await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: props.body.display_name ?? props.body.username,
      bio: props.body.bio ?? null,
      avatar_uri: props.body.avatar_uri ?? null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...RedditCloneMemberTransformer.select(),
  });
  // 5. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: v4(),
      reddit_clone_member_id: member.id,
      ip: props.ip,
      href: props.body.href,
      user_agent: null,
      referrer: props.body.referrer,
      access_token: "",
      refresh_token: "",
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 6. Generate JWT tokens after session creation
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with tokens
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 8. Create email verification
  const verificationToken = v4();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.reddit_clone_member_email_verifications.create({
    data: {
      id: v4(),
      member_id: member.id,
      email: props.body.email,
      token: verificationToken,
      created_at: now,
      expired_at: verificationExpires,
      used_at: null,
    },
  });
  // 9. Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 10. Return IAuthorized
  return {
    ...(await RedditCloneMemberTransformer.transform(member)),
    token,
  } satisfies IRedditCloneMember.IAuthorized;
}
