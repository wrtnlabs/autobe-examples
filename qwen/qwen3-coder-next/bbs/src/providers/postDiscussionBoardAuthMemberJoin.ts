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

export async function postDiscussionBoardAuthMemberJoin(props: {
  body: IDiscussionBoardMember.IJoin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create member record
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      role: "member" as const,
      is_banned: false,
      ban_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      role: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        access_token: v4(),
        refresh_token: v4(),
        expired_at: accessExpires.toISOString(),
        ip: "0.0.0.0",
        user_agent: "",
        created_at: new Date().toISOString(),
      },
      select: {
        id: true,
        expired_at: true,
      },
    },
  );
  // Generate JWT tokens
  const access = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Build token object
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires.toISOString(),
    refreshable_until: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
  // Transform member to response format
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio,
    role: typia.assert<"guest" | "member" | "admin" | "superAdmin">(
      member.role,
    ),
    is_banned: member.is_banned,
    ban_reason: member.ban_reason,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
