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
  const { refresh_token } = props.body;
  let decoded: any;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException(
      "권한이 없습니다. 인증 토큰이 잘못되었거나 만료되었습니다.",
      401,
    );
  }
  if (!decoded || typeof decoded !== "object" || !decoded.id) {
    throw new HttpException(
      "권한이 없습니다. 인증 토큰이 잘못되었거나 만료되었습니다.",
      401,
    );
  }
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: decoded.id },
  });
  if (!member || member.deleted_at !== null || !member.email_verified) {
    throw new HttpException(
      "권한이 없습니다. 인증 토큰이 잘못되었거나 만료되었습니다.",
      401,
    );
  }
  // Issue new access token (1h) and refresh token (30d)
  const now = Date.now();
  const accessExp = Math.floor(now / 1000) + 60 * 60; // 1 hour
  const refreshExp = Math.floor(now / 1000) + 60 * 60 * 24 * 30; // 30 days
  const access = jwt.sign(
    { id: member.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: 60 * 60, issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: member.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: 60 * 60 * 24 * 30, issuer: "autobe" },
  );
  const expired_at = toISOStringSafe(new Date(accessExp * 1000));
  const refreshable_until = toISOStringSafe(new Date(refreshExp * 1000));
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
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
