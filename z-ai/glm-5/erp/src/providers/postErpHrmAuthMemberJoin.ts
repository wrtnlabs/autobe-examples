import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthMemberJoin(props: {
  ip: string;
  body: IErpHrmMember.IJoin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member with hashed password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const memberId = v4();
  const now = new Date();
  const member = await MyGlobal.prisma.erp_hrm_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password: hashedPassword,
      display_name: props.body.displayName,
      avatar_image: props.body.avatarImage ?? null,
      phone_number: props.body.phoneNumber ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_image: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_member_id: memberId,
      erp_hrm_organization_id: null,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_image: member.avatar_image,
    phone_number: member.phone_number ?? undefined,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IErpHrmMember.IAuthorized;
}
