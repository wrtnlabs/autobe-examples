import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserRefresh";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserRefresh(props: {
  body: IDiscussionBoardMemberUserRefresh.IRequest;
}): Promise<IDiscussionBoardMemberuser.IAuthorized> {
  // 1. Verify and decode the refresh token
  let decoded: any;

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Basic structural safeguards on decoded payload
  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    typeof decoded.type !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate token type
  if (decoded.type !== "memberuser") {
    throw new HttpException("Invalid token type", 403);
  }

  const memberUserId: string = decoded.id;
  const sessionId: string = decoded.session_id;

  // 3. Load session
  const session =
    await MyGlobal.prisma.discussion_board_memberuser_sessions.findFirst({
      where: {
        id: sessionId,
        discussion_board_memberuser_id: memberUserId,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 3b. Load associated member user explicitly using foreign key
  const member = await MyGlobal.prisma.discussion_board_memberusers.findFirst({
    where: {
      id: session.discussion_board_memberuser_id,
    },
  });

  if (!member) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 4. Check basic session validity (expired_at)
  if (session.expired_at && session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Optional revoked flag check if it exists (kept as any-access without affecting types)
  if ((session as any).revoked === true) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 5. Evaluate account lifecycle state
  if (member.deleted_at !== null) {
    throw new HttpException("Account is not allowed to refresh tokens", 403);
  }

  if (member.closed_at !== null || member.closed_by_admin === true) {
    throw new HttpException("Account is not allowed to refresh tokens", 403);
  }

  const blockedStatuses: string[] = ["suspended", "banned", "closed"];
  if (blockedStatuses.includes(member.account_status)) {
    throw new HttpException("Account is not allowed to refresh tokens", 403);
  }

  // 6. Build new JWT tokens with same session_id and member id
  const nowMillis = Date.now();
  const accessExpires = new Date(nowMillis + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(nowMillis + 7 * 24 * 60 * 60 * 1000); // 7 days

  const accessToken = jwt.sign(
    {
      id: member.id,
      session_id: sessionId,
      type: "memberuser",
      email: member.email,
      display_name: member.display_name,
      email_verified: member.email_verified,
      account_status: member.account_status,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: member.id,
      session_id: sessionId,
      type: "memberuser",
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 7. Update session expiration in DB to reflect new refresh token lifetime
  await MyGlobal.prisma.discussion_board_memberuser_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // 8. Map member entity to IDiscussionBoardMemberuser.IAuthorized response
  const authorized: IDiscussionBoardMemberuser.IAuthorized = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio ?? null,
    location: member.location ?? null,
    email_verified: member.email_verified,
    account_status: member.account_status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    last_login_at:
      member.last_login_at === null
        ? null
        : toISOStringSafe(member.last_login_at),
    closed_at:
      member.closed_at === null ? null : toISOStringSafe(member.closed_at),
    closed_by_admin: member.closed_by_admin,
    token,
  };

  return authorized;
}
