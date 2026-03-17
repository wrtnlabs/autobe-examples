import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAppAuthGuestRefresh(props: {
  body: IMultiUserTodoAppGuest.IRefresh;
}): Promise<IMultiUserTodoAppGuest.IAuthorized> {
  // Validate refresh token
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
    created_at: string & tags.Format<"date-time">;
  };
  // Verify session exists and belongs to this guest
  const session =
    await MyGlobal.prisma.multi_user_todo_app_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_app_guest_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Verify guest account is not deleted
  const guest =
    await MyGlobal.prisma.multi_user_todo_app_guests.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration times
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      token_type: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with new expiration
  await MyGlobal.prisma.multi_user_todo_app_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpires),
    },
  });
  // Return new tokens
  return {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    } satisfies IAuthorizationToken,
  } satisfies IMultiUserTodoAppGuest.IAuthorized;
}
