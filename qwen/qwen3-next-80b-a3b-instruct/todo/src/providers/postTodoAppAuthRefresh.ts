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

export async function postTodoAppAuthRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Verify refresh token
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
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_user_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate actor
  const user = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // Since the Prisma type does not include deleted_at, we cannot check it.
  // Any user found via findUniqueOrThrow is considered active (non-deleted).
  // 5. Generate new tokens (same session_id)
  const accessExpires = new Date(Date.now() + 20 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "20m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
  };
  // 6. Update session expiration
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
