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

export async function postErpHrmAuthMemberRefresh(props: {
  body: IErpHrmMember.IRefresh;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Verify refresh token
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
  // 3. Validate session exists
  const session = await MyGlobal.prisma.erp_hrm_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      erp_hrm_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  // 4. Validate member not deleted
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (same session_id)
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.erp_hrm_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
      updated_at: now,
    },
  });
  // 7. Return response with new tokens
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_image: member.avatar_image ?? null,
    phone_number: member.phone_number ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
