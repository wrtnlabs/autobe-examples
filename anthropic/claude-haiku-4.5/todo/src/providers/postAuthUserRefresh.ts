import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
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
  const session = await MyGlobal.prisma.todo_app_user_session.findFirst({
    where: {
      id: decoded.session_id,
      user_id: decoded.id,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Verify user exists and is not deleted
  const user = await MyGlobal.prisma.todo_app_user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Step 5: Generate new token expiration times
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);

  // Step 6: Generate new access token with SAME session_id
  const access: string = jwt.sign(
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

  // Step 7: Generate new refresh token with SAME session_id
  const refresh: string = jwt.sign(
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

  // Step 8: Update session expiration time in database
  await MyGlobal.prisma.todo_app_user_session.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpiresDate,
    },
  });

  // Step 9: Return authorized user with new tokens
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    last_active_at:
      user.last_active_at === null
        ? undefined
        : toISOStringSafe(user.last_active_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpiresDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  };
}
