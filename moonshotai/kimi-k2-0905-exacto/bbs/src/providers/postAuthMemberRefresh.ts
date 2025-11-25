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

export async function postAuthMemberRefresh(props: {
  body: IEconomicDiscussionMember.IRefresh;
}): Promise<IEconomicDiscussionMember.IAuthorized> {
  // Verify and decode refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "member";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.economic_discussion_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        economic_discussion_member_id: decoded.id,
      },
      include: {
        member: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Generate token expiration times as ISO strings
  const now = Date.now();
  const accessExpires = now + 30 * 60 * 1000; // 30 minutes
  const refreshExpires = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  // Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session expiration
  await MyGlobal.prisma.economic_discussion_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });

  return {
    member: {
      id: session.member.id,
      username: session.member.username,
      email: session.member.email,
    },
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 1800, // 30 minutes in seconds
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires)),
    },
  };
}
