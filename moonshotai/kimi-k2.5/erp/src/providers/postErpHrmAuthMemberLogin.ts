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

export async function postErpHrmAuthMemberLogin(props: {
  ip: string;
  body: IErpHrmMember.ILogin;
}): Promise<IErpHrmMember.IAuthorized> {
  // 1. Find member by email with password_hash for verification
  const member = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      first_name: true,
      last_name: true,
      avatar_url: true,
      timezone: true,
      locale: true,
      email_verified_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Check member exists and password matches (generic error for security)
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check account is not soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account is deactivated", 403);
  }
  // 4. Generate JWT tokens
  const sessionId = v4();
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create session record
  await MyGlobal.prisma.erp_hrm_member_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 6. Return IErpHrmMember.IAuthorized
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    firstName: member.first_name,
    lastName: member.last_name,
    avatarUrl: member.avatar_url as (string & tags.Format<"url">) | null,
    timezone: member.timezone,
    locale: member.locale,
    emailVerifiedAt:
      member.email_verified_at !== null
        ? (toISOStringSafe(member.email_verified_at) as string &
            tags.Format<"date-time">)
        : null,
    createdAt: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  };
}
