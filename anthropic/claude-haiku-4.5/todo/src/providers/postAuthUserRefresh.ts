import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  // Step 1: Verify and decode refresh token
  let decoded: Record<string, unknown> & {
    id: string;
    session_id: string;
    type: "user";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as Record<string, unknown> & {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate type matches expected actor type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and is active
  const session = await MyGlobal.prisma.todo_list_sessions.findUnique({
    where: { id: decoded.session_id as string & tags.Format<"uuid"> },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Verify session belongs to the user
  if (
    session.todo_list_user_id !== (decoded.id as string & tags.Format<"uuid">)
  ) {
    throw new HttpException("Session mismatch", 403);
  }

  // Verify user still exists and is not deleted
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 4: Check if token has been revoked in blacklist
  const tokenJti = decoded.jti;

  if (tokenJti && typeof tokenJti === "string") {
    const blacklistEntry =
      await MyGlobal.prisma.todo_list_token_blacklist.findFirst({
        where: {
          todo_list_user_id: decoded.id as string & tags.Format<"uuid">,
          token_jti: tokenJti,
        },
      });

    if (blacklistEntry) {
      throw new HttpException("Token has been revoked", 401);
    }
  }

  // Step 5: Generate new tokens with SAME session_id
  const now = new Date();
  const nowTimestamp = now.toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const accessExpiresString = accessExpires.toISOString() as string &
    tags.Format<"date-time">;
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpiresString = refreshExpires.toISOString() as string &
    tags.Format<"date-time">;

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowTimestamp,
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
      created_at: nowTimestamp,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Update session expiration and last activity time
  await MyGlobal.prisma.todo_list_sessions.update({
    where: { id: decoded.session_id as string & tags.Format<"uuid"> },
    data: {
      absolute_timeout_at: refreshExpires,
      last_activity_at: now,
    },
  });

  // Step 7: Return authorized response
  return {
    id: session.user.id,
    email: session.user.email,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at:
      session.user.deleted_at === null
        ? null
        : toISOStringSafe(session.user.deleted_at),
    last_login_at:
      session.user.last_login_at === null
        ? null
        : toISOStringSafe(session.user.last_login_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
    },
  };
}
