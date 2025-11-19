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

export async function postAuthMemberRefresh(props: {
  body: IDiscussionBoardMember.IRefresh;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "member";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.id,
        expired_at: null,
      },
      include: {
        member: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  if (session.member.is_suspended) {
    throw new HttpException(
      session.member.suspension_reason ?? "Account is suspended",
      403,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpiresMs: number = Date.now() + 30 * 60 * 1000;
  const refreshExpiresMs: number = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresMs),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresMs),
  );

  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresMs),
    },
  });

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: session.member.id,
    email: session.member.email,
    username: session.member.username,
    display_name: session.member.display_name ?? undefined,
    bio: session.member.bio ?? undefined,
    avatar_url: session.member.avatar_url ?? undefined,
    email_verified: session.member.email_verified,
    email_verified_at: session.member.email_verified_at
      ? toISOStringSafe(session.member.email_verified_at)
      : undefined,
    is_suspended: session.member.is_suspended,
    suspension_reason: session.member.suspension_reason ?? undefined,
    suspended_until: session.member.suspended_until
      ? toISOStringSafe(session.member.suspended_until)
      : undefined,
    last_login_at: session.member.last_login_at
      ? toISOStringSafe(session.member.last_login_at)
      : undefined,
    created_at: toISOStringSafe(session.member.created_at),
    updated_at: toISOStringSafe(session.member.updated_at),
    deleted_at: session.member.deleted_at
      ? toISOStringSafe(session.member.deleted_at)
      : undefined,
    token,
  };
}
