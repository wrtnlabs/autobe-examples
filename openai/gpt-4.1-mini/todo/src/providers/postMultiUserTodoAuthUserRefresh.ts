import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthUserRefresh(props: {
  body: IMultiUserTodoUser.IRefresh;
}): Promise<IMultiUserTodoUser.IAuthorized> {
  let decoded: unknown;
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid token payload", 401);
  }
  if (
    typeof (decoded as Record<string, unknown>).type !== "string" ||
    typeof (decoded as Record<string, unknown>).id !== "string" ||
    typeof (decoded as Record<string, unknown>).session_id !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const tokenType = (decoded as Record<string, string>).type;
  if (tokenType !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  const userId = (decoded as Record<string, string>).id;
  const sessionId = (decoded as Record<string, string>).session_id;
  // Validate session
  const session = await MyGlobal.prisma.multi_user_todo_user_sessions.findFirst(
    {
      where: { id: sessionId, multi_user_todo_user_id: userId },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate user
  const user = await MyGlobal.prisma.multi_user_todo_users.findUniqueOrThrow({
    where: { id: userId },
  });
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowMs = Date.now();
  // Functional helper to format timestamp to ISO string as string & tags.Format<'date-time'>
  const toIsoString = (
    timestamp: number,
  ): string & tags.Format<"date-time"> => {
    return toISOStringSafe(new Date(timestamp)) as string &
      tags.Format<"date-time">;
  };
  const accessExpires = toIsoString(nowMs + 60 * 60 * 1000);
  const refreshExpires = toIsoString(nowMs + 7 * 24 * 60 * 60 * 1000);
  const createdAt = toIsoString(nowMs);
  const accessToken = jwt.sign(
    {
      type: "user",
      id: userId,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: userId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.multi_user_todo_user_sessions.update({
    where: { id: sessionId },
    data: { expired_at: refreshExpires },
  });
  return {
    id: user.id,
    displayName: user.display_name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
