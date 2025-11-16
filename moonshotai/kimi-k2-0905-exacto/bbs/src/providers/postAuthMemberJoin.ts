import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: IEconomicDiscussionMember.ICreate;
}): Promise<IEconomicDiscussionMember.IAuthorized> {
  // Check for existing username
  const existingUsername =
    await MyGlobal.prisma.economic_discussion_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }

  // Check for existing email
  const existingEmail =
    await MyGlobal.prisma.economic_discussion_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create member record
  const member = await MyGlobal.prisma.economic_discussion_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      username: props.body.username,
      email: props.body.email,
      password_hash: hashedPassword,
      email_verified: props.body.email_verified ?? false,
      reputation_score: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Create session
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.economic_discussion_member_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_discussion_member_id: member.id,
        ip: "0.0.0.0", // Populated by middleware in production
        href: "/auth/member/join",
        referrer: null,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
      },
    });

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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    member: {
      id: member.id,
      username: member.username,
      email: member.email,
    },
    access_token: token.access,
    refresh_token: token.refresh,
    expires_in: 3600 as number & tags.Type<"int32">,
    token,
  };
}
