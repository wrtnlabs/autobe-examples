import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUser";
import { IPoliticsBbsVisitorUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitorUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { VisitorPayload } from "../decorators/payload/VisitorPayload";

export async function patchAuthVisitorRefresh(props: {
  visitor: VisitorPayload;
  body: IPoliticsBbsUser.IRefresh;
}): Promise<IPoliticsBbsVisitorUser.IAuthorized> {
  // Decode and verify the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "visitor";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "visitor";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate type matches visitor type
  if (decoded.type !== "visitor") {
    throw new HttpException("Invalid token type", 403);
  }

  // Verify session exists and belongs to correct visitor
  const session = await MyGlobal.prisma.politics_bbs_visitor_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        politics_bbs_visitor_id: decoded.id,
        expired_at: null,
      },
      include: {
        visitor: true,
      },
    },
  );

  if (!session) {
    throw new HttpException("Session expired or not found", 401);
  }

  // Check if visitor account is active - no deleted_at field in Prisma schema
  // The visitor object only contains: id, created_at, username, password_hash, last_seen_at

  // Generate new access and refresh tokens
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ); // 24 hours

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "24h",
      issuer: "autobe",
    },
  );

  // Update session expiration time
  await MyGlobal.prisma.politics_bbs_visitor_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return visitor data with new tokens
  return {
    id: session.visitor.id as string & tags.Format<"uuid">,
    username: session.visitor.username,
    password_hash: session.visitor.password_hash satisfies string as string,
    created_at: toISOStringSafe(session.visitor.created_at),
    last_seen_at: session.visitor.last_seen_at
      ? toISOStringSafe(session.visitor.last_seen_at)
      : toISOStringSafe(new Date()),
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IPoliticsBbsVisitorUser.IAuthorized;
}
