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
    throw new HttpException("Email already registered", 409);
  }

  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: props.body.username },
    });

  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      username: props.body.username,
      status: "active",
      email_verified: false,
      created_at: now,
      updated_at: now,
    },
  });

  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    },
  );

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
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
    username: member.username,
    email: member.email,
    status: member.status,
    email_verified: member.email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    token,
  };
}
