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

export async function postCommunityAuthMemberLogin(props: {
  ip: string;
  body: ICommunityMember.ILogin;
}): Promise<ICommunityMember.IAuthorized> {
  // 1. Find member by email (must not be soft-deleted), include profile fields
  const member = await MyGlobal.prisma.community_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      profile: {
        select: {
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
        },
      },
    },
  });
  // 2. Generic 401 if not found — do not reveal whether email or password is wrong
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 3. Verify password against stored hash
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 4. Compute expiry timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  // 5. Generate new session id
  const sessionId = v4();
  // 6. Sign JWT access token
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 7. Sign JWT refresh token
  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Persist the new session record
  await MyGlobal.prisma.community_member_sessions.create({
    data: {
      id: sessionId,
      community_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 9. Build and return ICommunityMember.IAuthorized
  const profile = member.profile;
  return {
    id: member.id,
    username: member.username,
    email: member.email,
    display_name: profile?.display_name ?? null,
    bio: profile?.bio ?? null,
    avatar_url: profile?.avatar_url ?? null,
    karma_score: profile?.karma_score ?? 0,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies ICommunityMember.IAuthorized;
}
