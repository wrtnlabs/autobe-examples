import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberJoin(props: {
  body: IRedditPlatformMember.IJoin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Validate password complexity
  const password = props.body.password;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    throw new HttpException(
      "Password must contain uppercase, lowercase, number, and special character",
      400,
    );
  }
  // 2. Check email uniqueness
  const existingEmail = await MyGlobal.prisma.reddit_platform_members.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 3. Check username uniqueness
  const existingUsername =
    await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 4. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 5. Generate UUIDs
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  // 6. Set timestamps
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 7. Create member record
  const member = await MyGlobal.prisma.reddit_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: null,
      bio: null,
      avatar_file_id: null,
      karma_score: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_file_id: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      email: true,
    },
  });
  // 8. Create session record
  await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: sessionId,
      reddit_platform_member_id: memberId,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      access_token: "",
      refresh_token: "",
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 9. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 10. Update session with tokens
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 11. Construct response
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: null,
    karma_score: member.karma_score,
    created_at: now,
    updated_at: now,
    email: member.email,
    accessToken: accessToken,
    expiresAt: toISOStringSafe(accessExpires),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
