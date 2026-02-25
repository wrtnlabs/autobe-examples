import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthMemberLogin(props: {
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Find member with password_hash
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      is_active: true,
      is_admin: true,
      is_super_admin: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException(
      {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid credentials",
      },
      401,
    );
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException(
      {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid credentials",
      },
      401,
    );
  }
  // 3. Check if account is banned
  if (!member.is_active) {
    throw new HttpException(
      {
        code: "AUTH_ACCOUNT_BANNED",
        message: "Your account has been banned",
      },
      403,
    );
  }
  // 4. Create NEW session
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpiresAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshableUntil = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        access_token: v4(),
        expired_at: accessExpiresAt,
        created_at: now,
        updated_at: now,
        last_active_at: now,
        ip: props.body.ip ?? "",
        headers: JSON.stringify({}),
        refresh_token: v4(),
        token_issued_at: now,
        token_version: 0,
        refresh_token_issued_at: now,
      },
    },
  );
  // 5. Generate JWT tokens
  const accessPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: now,
  };
  const refreshPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: now,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshableUntil,
  };
  // 6. Build response
  const memberSummary: IDiscussionBoardMember.ISummary = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio ?? null,
    is_active: member.is_active,
    is_admin: member.is_admin,
    is_super_admin: member.is_super_admin,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    bio: member.bio ?? null,
    isActive: member.is_active,
    isAdmin: member.is_admin,
    isSuperAdmin: member.is_super_admin,
    createdAt: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    access_token: token.access,
    refresh_token: token.refresh,
    member: memberSummary,
    token: token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
