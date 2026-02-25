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
  // Validate input using typia
  const validated = typia.assert<IDiscussionBoardMember.IJoin>(props.body);
  // Check for duplicate email
  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: validated.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Create member record
  const now = new Date();
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: validated.email,
      password_hash: await PasswordUtil.hash(validated.password),
      display_name: validated.displayName,
      bio: null,
      is_active: true,
      is_admin: false,
      is_super_admin: false,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
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
    },
  });
  // Create session
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        access_token: v4(),
        expired_at: toISOStringSafe(accessExpires),
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
        last_active_at: toISOStringSafe(now),
        ip: "",
        headers: "",
        refresh_token: v4(),
        token_issued_at: toISOStringSafe(now),
        token_version: 0,
        refresh_token_issued_at: toISOStringSafe(now),
      },
      select: {
        id: true,
      },
    },
  );
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Build response
  const response: IDiscussionBoardMember.IAuthorized = {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    bio: member.bio ?? undefined,
    isActive: member.is_active,
    isAdmin: member.is_admin,
    isSuperAdmin: member.is_super_admin,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    access_token: accessToken,
    member: {
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      bio: member.bio ?? undefined,
      is_active: member.is_active,
      is_admin: member.is_admin,
      is_super_admin: member.is_super_admin,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    } satisfies IDiscussionBoardMember.ISummary,
    refresh_token: refreshToken,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  };
  return response;
}
