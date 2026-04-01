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
import { HrmPlatformMemberTransformer } from "../transformers/HrmPlatformMemberTransformer";
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
      ...HrmPlatformMemberTransformer.select().select,
      password_hash: true,
      deleted_at: true,
      email: true,
    },
  });
  // 2. Verify member exists and is not soft-deleted
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new session with expiration timestamps
  const accessExpiresInMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = new Date();
  const accessExpires = new Date(now.getTime() + accessExpiresInMs);
  const refreshExpires = new Date(now.getTime() + refreshExpiresInMs);
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: v4(),
      hrm_platform_member_id: member.id,
      ip: props.ip,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 5. Generate JWT tokens
  const nowIso = toISOStringSafe(now);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: nowIso,
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
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized response
  const transformedMember = await HrmPlatformMemberTransformer.transform({
    id: member.id,
    display_name: member.display_name,
    avatar_image: member.avatar_image,
    phone_number: member.phone_number,
    created_at: member.created_at,
    updated_at: member.updated_at,
  });
  return {
    ...transformedMember,
    email: member.email,
    avatarImage: transformedMember.avatarImage ?? null,
    phoneNumber: transformedMember.phoneNumber ?? null,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
