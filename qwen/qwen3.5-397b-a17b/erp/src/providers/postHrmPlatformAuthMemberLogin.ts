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
  // 1. Find member by email with password_hash for verification
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  // 2. Validate member exists and is not soft-deleted
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Generate session ID and calculate expiration times
  const sessionId = v4();
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Create new session record
  await MyGlobal.prisma.hrm_platform_member_sessions.create({
    data: {
      id: sessionId,
      member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // 7. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    avatarUrl: member.avatar_url ?? null,
    phoneNumber: member.phone_number ?? null,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      avatar_url: member.avatar_url ?? null,
      phone_number: member.phone_number ?? null,
      created_at: toISOStringSafe(member.created_at),
    } satisfies IHrmPlatformMember.ISummary,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    } satisfies IAuthorizationToken,
  } satisfies IHrmPlatformMember.IAuthorized;
}
