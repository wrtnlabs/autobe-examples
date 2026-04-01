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
  interface IRefreshTokenPayload {
    type: "member";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    tokenType: "refresh";
    created_at: string & tags.Format<"date-time">;
  }
  let decoded: IRefreshTokenPayload;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as IRefreshTokenPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and get session data
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // 4. Validate session not expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate refresh token hash matches
  const refreshMatches = await PasswordUtil.verify(
    props.body.refresh_token,
    session.refresh_token_hash,
  );
  if (!refreshMatches) {
    throw new HttpException("Invalid refresh token", 401);
  }
  // 6. Validate member not deleted
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: decoded.id },
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
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 7. Generate new tokens
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Hash new tokens
  const newAccessTokenHash = await PasswordUtil.hash(newAccessToken);
  const newRefreshTokenHash = await PasswordUtil.hash(newRefreshToken);
  // 9. Update session with new token hashes and extended expiration
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token_hash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      expired_at: refreshExpiresAt,
    },
  });
  // 10. Return member profile with new tokens
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_image: member.avatar_image ?? undefined,
    phone_number: member.phone_number ?? undefined,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  };
}
