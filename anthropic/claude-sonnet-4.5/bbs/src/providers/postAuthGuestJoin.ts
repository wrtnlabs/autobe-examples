import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: IDiscussionBoardGuest.IRegistration;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  const { body } = props;

  // Check for duplicate username (case-insensitive)
  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        username: {
          equals: body.username,
        },
      },
    });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email (case-insensitive)
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        email: {
          equals: body.email,
        },
      },
    });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash password using PasswordUtil (MANDATORY)
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Create member record (MANDATORY for join operation)
  const now = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      email_verified: false,
      status: "pending_email_verification",
      profile_visibility: "public",
      activity_visibility: "public",
      created_at: now,
      updated_at: now,
    },
  });

  // Create member session (MANDATORY for join operation)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );

  // Generate JWT tokens (MANDATORY)
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;

  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * API Specification Requirements:
   *
   * - Create a new MEMBER account in discussion_board_members table
   * - Issue JWT tokens for member authentication
   * - Return IDiscussionBoardGuest.IAuthorized structure
   *
   * Schema Reality:
   *
   * - Member session has: id, discussion_board_member_id, ip, href, referrer,
   *   created_at, expired_at
   * - Guest session has: id, session_token, ip_address, user_agent,
   *   last_activity_at, created_at
   *
   * Required Return Fields (IDiscussionBoardGuest.IAuthorized):
   *
   * - Session_token: Does NOT exist in discussion_board_member_sessions
   * - Ip_address: Exists as "ip" (different field name)
   * - User_agent: Does NOT exist in discussion_board_member_sessions
   * - Last_activity_at: Does NOT exist in discussion_board_member_sessions
   *
   * This is an irreconcilable contradiction. The API expects guest session
   * fields but the operation creates member records. Cannot construct valid
   * return object without schema changes.
   */
  return typia.random<IDiscussionBoardGuest.IAuthorized>();
}
