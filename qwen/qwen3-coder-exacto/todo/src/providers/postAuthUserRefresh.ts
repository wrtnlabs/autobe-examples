import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
}): Promise<ITodoListUserListUser.IAuthorized> {
  // Get the user and session information from the payload
  const { id, session_id } = props.user;

  // Validate session exists and is active
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: session_id,
      todo_list_user_id: id,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  } else if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Generate new access and refresh tokens with same session ID
  const now = Date.now();
  const accessExpiresTimestamp = now + 60 * 60 * 1000; // 1 hour
  const refreshExpiresTimestamp = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresTimestamp),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresTimestamp),
  );

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: id,
        session_id: session_id,
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
        type: "user",
        id: id,
        session_id: session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Update session expiration time
  await MyGlobal.prisma.todo_list_user_sessions.update({
    where: {
      id: session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresTimestamp),
    },
  });

  // Return authorized user information with new tokens
  return {
    id: session.user.id,
    email: session.user.email,
    token: token,
  };
}
