import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserRefresh(props: {
  body: ITodoAppTodoUser.IRefresh;
}): Promise<ITodoAppTodoUser.IAuthorized> {
  const { body } = props;
  const { refresh_token } = body;

  // 1) Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id?: string;
    type: string;
    created_at?: string;
  };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as {
      id: string;
      session_id?: string;
      type: string;
      created_at?: string;
    };
  } catch (e) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2) Validate token actor type
  if (decoded.type !== "todouser") {
    throw new HttpException("Invalid token type", 403);
  }

  // 3) Load the user record
  const user = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: decoded.id },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (user.status !== "active") {
    throw new HttpException("Account not active", 403);
  }

  // 4) Verify token issuance time against refresh_tokens_revoked_at
  if (user.refresh_tokens_revoked_at) {
    const revokedMs = user.refresh_tokens_revoked_at.getTime();
    const issuedMs = decoded.created_at ? Date.parse(decoded.created_at) : NaN;
    if (isNaN(issuedMs) || issuedMs < revokedMs) {
      throw new HttpException("Refresh token revoked", 401);
    }
  }

  // 5) Generate new tokens (reuse session_id when present)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 6) Build and return the authorized DTO
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? null,
    is_verified: user.is_verified,
    status: user.status,
    mfa_enabled: user.mfa_enabled,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
    deletedAt: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    user: {
      id: user.id,
      displayName: user.display_name ?? null,
      isVerified: user.is_verified,
      status: user.status,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
    },
  };
}
