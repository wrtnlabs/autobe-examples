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

export async function postHrmPlatformAuthMemberLogin(props: {
  ip: string;
  body: IHrmPlatformMember.ILogin;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      avatar_image: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Verify member exists
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password using PasswordUtil.verify()
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Validate member is not soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account is deactivated", 401);
  }
  // 5. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      ip: props.ip,
      href: null,
      referrer: null,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 6. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Return IAuthorized response
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
