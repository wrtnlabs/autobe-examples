import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { email, password } = props.body;

  // Find member by email (case-insensitive), must not be soft-deleted
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: email,
      deleted_at: null,
    },
  });

  if (!member || !member.email_verified) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check password via PasswordUtil
  const pwOk = await PasswordUtil.verify(password, member.password_hash);
  if (!pwOk) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Compute expiration date-times as ISO strings directly (never use Date type in variables)
  const nowMs = Date.now();
  const accessMs = nowMs + 60 * 60 * 1000;
  const refreshMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  const expired_at = toISOStringSafe(new Date(accessMs));
  const refreshable_until = toISOStringSafe(new Date(refreshMs));
  // MemberPayload: { id, type: "member" }
  const jwtPayload = { id: member.id, type: "member" };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  return {
    id: member.id,
    email: member.email,
    username: member.username,
    email_verified: member.email_verified,
    registration_completed_at: toISOStringSafe(
      member.registration_completed_at,
    ),
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    // If deleted_at is null, omit field (so it's undefined per DTO)
    ...(member.deleted_at !== null && {
      deleted_at: toISOStringSafe(member.deleted_at),
    }),
    token: {
      access: access,
      refresh: refresh,
      expired_at: expired_at,
      refreshable_until: refreshable_until,
    },
  };
}
