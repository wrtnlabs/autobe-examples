import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserLogin(props: {
  body: IDiscussionBoardMemberUserLogin.IRequest;
}): Promise<IDiscussionBoardMemberuser.IAuthorized> {
  const { body } = props;

  const member = await MyGlobal.prisma.discussion_board_memberusers.findFirst({
    where: {
      email: body.email,
    },
  });

  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (
    member.deleted_at !== null ||
    member.closed_at !== null ||
    member.closed_by_admin === true ||
    member.account_status !== "active"
  ) {
    throw new HttpException("Account is not available for login", 403);
  }

  const passwordValid = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );

  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = new Date();
  const accessExpiry = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.discussion_board_memberuser_sessions.create({
      data: {
        id: v4(),
        discussion_board_memberuser_id: member.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpiry),
      },
    });

  const updatedMember =
    await MyGlobal.prisma.discussion_board_memberusers.update({
      where: {
        id: member.id,
      },
      data: {
        last_login_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      },
    });

  const tokenCreatedAt = toISOStringSafe(now);

  const accessToken = jwt.sign(
    {
      type: "memberuser",
      id: updatedMember.id,
      session_id: session.id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "memberuser",
      id: updatedMember.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpiry),
    refreshable_until: toISOStringSafe(refreshExpiry),
  };

  return {
    id: updatedMember.id,
    email: updatedMember.email,
    display_name: updatedMember.display_name,
    bio: updatedMember.bio,
    location: updatedMember.location,
    email_verified: updatedMember.email_verified,
    account_status: updatedMember.account_status,
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at:
      updatedMember.deleted_at !== null
        ? toISOStringSafe(updatedMember.deleted_at)
        : null,
    last_login_at:
      updatedMember.last_login_at !== null
        ? toISOStringSafe(updatedMember.last_login_at)
        : null,
    closed_at:
      updatedMember.closed_at !== null
        ? toISOStringSafe(updatedMember.closed_at)
        : null,
    closed_by_admin: updatedMember.closed_by_admin,
    token,
  };
}
