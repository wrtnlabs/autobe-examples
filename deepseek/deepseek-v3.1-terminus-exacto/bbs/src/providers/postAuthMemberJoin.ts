import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }

  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // Create member record
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      username: props.body.username,
      password_hash: hashedPassword,
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
        deleted_at: null,
      },
    },
  );

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
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
    display_name: member.display_name ?? undefined,
    bio: member.bio ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
    token,
  };
}
