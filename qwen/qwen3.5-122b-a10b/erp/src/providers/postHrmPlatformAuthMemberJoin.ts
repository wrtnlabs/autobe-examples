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
  // 2. Create member record with hashed password
  const now = new Date();
  const member = await MyGlobal.prisma.hrm_platform_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      avatar_image: null,
      phone_number: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Create email verification token
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const verificationToken = v4();
  await MyGlobal.prisma.hrm_platform_member_email_verifications.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      token: verificationToken,
      expires_at: verificationExpires,
      verified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized response
  return {
    id: member.id,
    displayName: member.display_name,
    avatarImage: member.avatar_image,
    phoneNumber: member.phone_number,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    email: member.email,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
