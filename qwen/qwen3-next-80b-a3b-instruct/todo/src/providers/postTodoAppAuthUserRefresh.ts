import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthUserRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  // AutoBE framework automatically extracts and validates the refresh token from the Authorization header
  // The decoded authentication payload is available via props.auth
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  };
  try {
    // Validate that auth is available and contains refresh token
    if (!props.auth || !props.auth.token || !props.auth.token.refresh) {
      throw new HttpException("No refresh token provided", 401);
    }
    // Decode and verify the refresh token
    decoded = jwt.verify(
      props.auth.token.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id, // Correct foreign key field name from schema
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate user is still active
  const user = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new access token with issuer and expiration
  const accessExp = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  // Generate new refresh token
  const refresh = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );
  // Update session expiration time
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExp,
    },
  });
  // Return new tokens and user profile
  return {
    display_name: user.display_name,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    id: user.id,
    token: {
      access,
      refresh,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
  };
}
