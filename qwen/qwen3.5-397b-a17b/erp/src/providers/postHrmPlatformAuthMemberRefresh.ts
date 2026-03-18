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

export async function postHrmPlatformAuthMemberRefresh(props: {
  body: IHrmPlatformMember.IRefresh;
}): Promise<IHrmPlatformMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    member_id: string;
    session_id: string;
    type: "member";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find session by refresh_token
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      member_id: decoded.member_id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }
  // 4. Validate session not expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Find member and verify not deleted
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: decoded.member_id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens and extended expiration
  const updateData: Prisma.hrm_platform_member_sessionsUpdateInput = {
    access_token: access,
    refresh_token: refresh,
    expired_at: refreshExpires,
  };
  if (props.body.ip !== undefined) {
    updateData.ip = props.body.ip;
  }
  if (props.body.href !== undefined) {
    updateData.href = props.body.href;
  }
  if (props.body.referrer !== undefined) {
    updateData.referrer = props.body.referrer;
  }
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: session.id },
    data: updateData,
  });
  // 8. Return authorized response
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    avatarUrl: member.avatar_url ?? null,
    phoneNumber: member.phone_number ?? null,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: null,
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      avatar_url: member.avatar_url ?? null,
      phone_number: member.phone_number ?? null,
      created_at: toISOStringSafe(member.created_at),
    } satisfies IHrmPlatformMember.ISummary,
    token: {
      access: access,
      refresh: refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  };
}
