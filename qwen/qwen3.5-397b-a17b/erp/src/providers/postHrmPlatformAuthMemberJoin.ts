import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthMemberJoin(props: {
  ip: string;
  body: IHrmPlatformMember.IJoin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const member = await MyGlobal.prisma.hrm_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      avatar_image: props.body.avatar_image ?? null,
      phone_number: props.body.phone_number ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 4. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: "",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: "",
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Hash tokens for session storage
  const accessTokenHash = await PasswordUtil.hash(accessToken);
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);
  // 6. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: sessionId,
      member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      device_info: "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 7. Re-sign tokens with actual session_id
  const finalAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const finalRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with correct token hashes
  const finalAccessTokenHash = await PasswordUtil.hash(finalAccessToken);
  const finalRefreshTokenHash = await PasswordUtil.hash(finalRefreshToken);
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token_hash: finalAccessTokenHash,
      refresh_token_hash: finalRefreshTokenHash,
    },
  });
  // 9. Create email verification token
  const verificationToken = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.hrm_platform_member_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_member_id: member.id,
      token: verificationToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 10. Return IAuthorized response
  const token: IAuthorizationToken = {
    access: finalAccessToken,
    refresh: finalRefreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_image: member.avatar_image ?? null,
    phone_number: member.phone_number ?? null,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
