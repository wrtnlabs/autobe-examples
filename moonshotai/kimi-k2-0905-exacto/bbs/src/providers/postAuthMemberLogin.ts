import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IEconomicDiscussionMember.ILogin;
}): Promise<IEconomicDiscussionMember.IAuthorized> {
  // Find member by email for authentication
  const member = await MyGlobal.prisma.economic_discussion_members.findFirst({
    where: { email: props.body.email },
  });

  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password_hash,
    member.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if email is verified
  if (!member.email_verified) {
    throw new HttpException("Please verify your email first", 403);
  }

  // Create new session for this login
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session =
    await MyGlobal.prisma.economic_discussion_member_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_discussion_member_id: member.id,
        // Add required properties that were missing
        ip: "0.0.0.0",
        href: "/",
        created_at: now,
        expired_at: accessExpires,
      },
    });

  // Generate JWT tokens with proper payload structure
  const tokenPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: toISOStringSafe(now),
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });

  const refreshTokenPayload = {
    ...tokenPayload,
    tokenType: "refresh" as const,
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration time in seconds
  const expiresInSeconds = Math.floor(
    (accessExpires.getTime() - now.getTime()) / 1000,
  );

  // Return authorized member response
  return {
    member: {
      id: member.id,
      username: member.username,
      email: member.email,
    },
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresInSeconds as number & tags.Type<"int32">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(session.expired_at ?? accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
