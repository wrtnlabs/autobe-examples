import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberJoin(props: {
  member: MemberPayload;
  body: IEconPolDiscussionBoardMember.ICreate;
}): Promise<IEconPolDiscussionBoardMember.IAuthorized> {
  // Check if username already exists
  const existingUserByUsername =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findFirst({
      where: { username: props.body.username, deleted_at: null },
    });
  if (existingUserByUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check if email already exists
  const existingUserByEmail =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });
  if (existingUserByEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Generate current datetime string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create member record
  const memberId: string & tags.Format<"uuid"> = v4();
  const member = await MyGlobal.prisma.econ_pol_discussion_board_members.create(
    {
      data: {
        id: memberId,
        username: props.body.username,
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Calculate expiry timestamps
  const accessExpireAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpireAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create session record
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_member_sessions.create({
      data: {
        id: sessionId,
        econ_pol_discussion_board_member_id: memberId,
        created_at: now,
        expired_at: accessExpireAt,
        ip: "127.0.0.1",
        href: "https://example.com",
        referrer: "",
      },
    });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: member.id,
    username: member.username,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : toISOStringSafe(new Date()),
      refreshable_until: refreshExpireAt,
    },
  } satisfies IEconPolDiscussionBoardMember.IAuthorized;
}
