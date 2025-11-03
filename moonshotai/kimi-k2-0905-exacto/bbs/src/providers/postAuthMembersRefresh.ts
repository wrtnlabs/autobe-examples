import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMembersRefresh(props: {
  body: IPoliticsBbsMember.IRefresh;
}): Promise<IPoliticsBbsMember.IAuthorized> {
  // Decode and validate refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type for member refresh", 403);
  }

  // Check session exists and is valid
  const session = await MyGlobal.prisma.politics_bbs_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      politics_bbs_member_id: decoded.id,
    },
    include: {
      member: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }

  if (session.member.deleted_at !== null) {
    throw new HttpException("Member account is deleted", 403);
  }

  // Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session expiration
  await MyGlobal.prisma.politics_bbs_member_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  const accessExpiresIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const refreshExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);

  const authorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  } satisfies IAuthorizationToken;

  return {
    id: session.member.id,
    username: session.member.username,
    password_hash: session.member.password_hash,
    email: session.member.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(session.member.created_at),
    updated_at: toISOStringSafe(session.member.updated_at),
    deleted_at: session.member.deleted_at
      ? toISOStringSafe(session.member.deleted_at)
      : null,
    role: "member",
    token: authorizationToken,
  } satisfies IPoliticsBbsMember.IAuthorized;
}
