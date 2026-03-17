import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberJoin(props: {
  ip: string;
  body: ICommunityMember.IJoin;
}): Promise<ICommunityMember.IAuthorized> {
  // 1. Check for existing email or username conflicts (including soft-deleted accounts to preserve reservation)
  const existingByEmail = await MyGlobal.prisma.community_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existingByEmail !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const existingByUsername = await MyGlobal.prisma.community_members.findFirst({
    where: { username: props.body.username },
    select: { id: true },
  });
  if (existingByUsername !== null) {
    throw new HttpException("Username already taken", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate IDs upfront so tokens can reference the session ID correctly
  const memberId = typia.assert<string & tags.Format<"uuid">>(v4());
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const now = new Date();
  // 4. Create member record
  await MyGlobal.prisma.community_members.create({
    data: {
      id: memberId,
      username: props.body.username,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create user profile (1:1, atomically with member creation)
  await MyGlobal.prisma.community_user_profiles.create({
    data: {
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      community_member_id: memberId,
      display_name: null,
      bio: null,
      avatar_url: null,
      karma_score: 0,
      created_at: now,
      updated_at: now,
    },
  });
  // 6. Create email verification token (expires in 24 hours)
  const verificationExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.community_member_email_verifications.create({
    data: {
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      community_member_id: memberId,
      token: v4(),
      expires_at: verificationExpiresAt,
      verified_at: null,
      created_at: now,
    },
  });
  // 7. Generate JWT tokens (session ID known upfront)
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Create session record
  await MyGlobal.prisma.community_member_sessions.create({
    data: {
      id: sessionId,
      community_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpiresAt,
    },
  });
  // 9. Return IAuthorized with member details and token pair
  return {
    id: memberId,
    username: props.body.username,
    email: props.body.email,
    display_name: null,
    bio: null,
    avatar_url: null,
    karma_score: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies ICommunityMember.IAuthorized;
}
