import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthGuestRefresh(props: {
  body: IMultiUserTodoGuest.IRefresh;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  // 1. Verify refresh token
  const verifyResult: {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string;
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as any;
  if (verifyResult.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  const guestId: string & tags.Format<"uuid"> = verifyResult.id;
  const sessionId: string & tags.Format<"uuid"> = verifyResult.session_id;
  // 2. Validate session exists
  const session =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.findFirst({
      where: {
        id: sessionId,
        multi_user_todo_guest_id: guestId,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate guest exists and is not deleted
  const guest = await MyGlobal.prisma.multi_user_todo_guests.findUniqueOrThrow({
    where: { id: guestId },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Calculate new expiration times
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 5. Generate new tokens
  const access: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.multi_user_todo_guest_sessions.update({
    where: { id: sessionId },
    data: { expired_at: new Date(refreshExpires) },
  });
  // 7. Query session count
  const sessionsCount: number & tags.Type<"int32"> =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.count({
      where: { multi_user_todo_guest_id: guestId },
    });
  // 8. Construct response
  return {
    id: guest.id,
    fingerprint_hash: guest.fingerprint_hash,
    user_agent: guest.user_agent,
    ip_address: guest.ip_address,
    status: guest.status as "active" | "deleted" | "expired",
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
    sessions_count: sessionsCount,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
