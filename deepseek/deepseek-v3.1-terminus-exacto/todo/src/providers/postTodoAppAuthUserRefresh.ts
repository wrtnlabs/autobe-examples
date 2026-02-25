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
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      id: string;
      session_id: string;
      type: "user";
      created_at: string;
    };
    // Type validation through assignment
    if (
      typeof decoded !== "object" ||
      !decoded.id ||
      !decoded.session_id ||
      decoded.type !== "user"
    ) {
      throw new Error("Invalid token structure");
    }
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate session exists and not expired
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id,
      expired_at: {
        gt: new Date(Date.now() - 1000), // Current time with buffer
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate user exists and not deleted
  const user = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new tokens with updated expiration
  const now = Date.now();
  const accessExpiresMs = now + 30 * 60 * 1000; // 30 minutes
  const refreshExpiresMs = now + 30 * 24 * 60 * 60 * 1000; // 30 days
  const tokenPayload = {
    type: "user" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: toISOStringSafe(new Date(now)),
  };
  const newAccessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );
  // Update session with new tokens and expiration
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(refreshExpiresMs),
    },
  });
  const response: ITodoAppUser.IAuthorized = {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(new Date(accessExpiresMs)) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)) as string &
        tags.Format<"date-time">,
    },
  };
  return typia.assert<ITodoAppUser.IAuthorized>(response);
}
