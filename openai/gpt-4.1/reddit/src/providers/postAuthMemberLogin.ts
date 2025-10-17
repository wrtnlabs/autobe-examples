import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: ICommunityPlatformMember.ILogin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { email, password } = props.body;
  // 1. Look up user by email (must exist)
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { email },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 400);
  }
  // 2. Password verification
  const valid = await PasswordUtil.verify(password, member.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 400);
  }
  // 3. Email verified check
  if (!member.email_verified) {
    throw new HttpException("Email not verified", 403);
  }
  // 4. Status = active
  if (member.status !== "active") {
    throw new HttpException("Account blocked or inactive", 403);
  }

  // 5. Generate JWT access/refresh tokens
  //    - access: expires in 1h; refresh: expires in 7d
  const payload = { id: member.id, type: "member" };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Compute expiry as string & tags.Format<'date-time'>
  const now = Date.now();
  const expiredAt = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour later
  const refreshableUntil = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days later

  return {
    id: member.id,
    email: member.email,
    email_verified: member.email_verified,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
