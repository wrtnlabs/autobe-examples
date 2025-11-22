import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: ITodoAppAdministrator.IRefresh;
}): Promise<ITodoAppAdministrator.IAuthorized> {
  // Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "admin";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate the token type matches admin
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and belongs to the admin
  const session =
    await MyGlobal.prisma.todo_app_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        administrator_id: decoded.id,
        // Check if session is not expired (expired_at is null or in the future)
        OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
      },
      include: {
        administrator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  } else if (session.administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Generate new tokens with SAME session_id to maintain session continuity
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // SAME session_id for continuity
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id, // SAME session_id for continuity
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update session expiration time
  await MyGlobal.prisma.todo_app_administrator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return the new tokens and admin info
  return {
    id: session.administrator.id,
    token: token,
  };
}
