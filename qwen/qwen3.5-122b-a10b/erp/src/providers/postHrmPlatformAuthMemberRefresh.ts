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
  // 1. Verify refresh token signature and expiration
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
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
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate required fields exist
  if (!decoded.id || !decoded.session_id) {
    throw new HttpException("Invalid token payload", 401);
  }
  // 3. Look up session
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrm_platform_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }
  // 4. Verify session is not expired
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Verify member account is not soft-deleted
  const member = await MyGlobal.prisma.hrm_platform_members.findUnique({
    where: { id: decoded.id },
  });
  if (!member) {
    throw new HttpException("Member account not found", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Member account has been deleted", 403);
  }
  // 6. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Update session expiration
  await MyGlobal.prisma.hrm_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return IAuthorized response
  return {
    id: member.id as string & tags.Format<"uuid">,
    displayName: member.display_name,
    avatarImage: member.avatar_image ?? null,
    phoneNumber: member.phone_number ?? null,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    email: member.email as string & tags.Format<"email">,
    token,
  } satisfies IHrmPlatformMember.IAuthorized;
}
