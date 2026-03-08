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
  // Find member by email with password_hash
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      bio: true,
      banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Generic error if not found (prevents email enumeration)
  if (member === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if banned
  if (member.banned === true) {
    throw new HttpException("Account is banned", 403);
  }
  // Check if deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Terminate existing sessions (single session policy)
  await MyGlobal.prisma.discussion_board_member_sessions.deleteMany({
    where: { discussion_board_member_id: member.id },
  });
  // Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
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
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    bio: member.bio ?? null,
    banned: member.banned,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: null,
    token,
  };
}
