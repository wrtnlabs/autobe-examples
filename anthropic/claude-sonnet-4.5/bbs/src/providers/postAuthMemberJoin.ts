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

export async function postAuthMemberJoin(props: {
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email address is already registered", 409);
  }

  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username is already taken", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const now = new Date();
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password: hashedPassword,
      username: props.body.username,
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      avatar_url: null,
      email_verified: false,
      email_verified_at: null,
      is_suspended: false,
      suspension_reason: null,
      suspended_until: null,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.discussion_board_email_verifications.create({
    data: {
      id: v4(),
      discussion_board_member_id: member.id,
      token: v4(),
      email: props.body.email,
      expires_at: verificationExpiresAt,
      verified_at: null,
      created_at: now,
    },
  });

  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "0.0.0.0",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: null,
      },
    },
  );

  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30m",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name ?? null,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url ?? null,
    email_verified: member.email_verified,
    email_verified_at: member.email_verified_at
      ? toISOStringSafe(member.email_verified_at)
      : null,
    is_suspended: member.is_suspended,
    suspension_reason: member.suspension_reason ?? null,
    suspended_until: member.suspended_until
      ? toISOStringSafe(member.suspended_until)
      : null,
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : null,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
  };
}
