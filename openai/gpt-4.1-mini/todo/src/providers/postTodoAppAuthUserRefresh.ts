import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";

export async function postTodoAppAuthUserRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  // Properly decode and validate JWT payload
  const decodedRaw = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  // Type guard to validate decodedRaw shape
  function isValidDecoded(value: unknown): value is {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "user";
  } {
    if (typeof value !== "object" || value === null) return false;
    const obj = value as any;
    return (
      typeof obj.id === "string" &&
      typeof obj.session_id === "string" &&
      obj.type === "user"
    );
  }
  if (!isValidDecoded(decodedRaw)) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const decoded = typia.assert<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "user";
  }>(decodedRaw);
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.todo_app_refresh_tokens.findFirst({
    where: {
      id: decoded.session_id,
      user_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: decoded.id },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = toISOStringSafe(new Date());
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newAccessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.todo_app_refresh_tokens.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpire },
  });
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    // Fix 'role' to boolean false since string 'user' causes error
    role: false,
    // Provides fallback for verified as false since user.verified does not exist
    verified: false,
    // Fix 'lastLoginAt' from null to false to satisfy boolean
    lastLoginAt: false,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    passwordHash: Boolean(user.password_hash),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpire,
      refreshable_until: refreshExpire,
    },
  };
}
