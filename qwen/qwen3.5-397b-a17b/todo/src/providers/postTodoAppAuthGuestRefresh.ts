import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

function decodeJwtPayload(
  token: string,
  secret: string,
): {
  type: string;
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  created_at: string & tags.Format<"date-time">;
} {
  const verified = jwt.verify(token, secret, { issuer: "autobe" });
  if (typeof verified === "string" || !verified) {
    throw new HttpException("Invalid token format", 401);
  }
  const payload = verified;
  const typeValue = payload.type;
  const idValue = payload.id;
  const sessionIdValue = payload.session_id;
  const createdAtValue = payload.created_at;
  if (
    typeof typeValue !== "string" ||
    typeof idValue !== "string" ||
    typeof sessionIdValue !== "string" ||
    typeof createdAtValue !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  return {
    type: typeValue,
    id: idValue,
    session_id: sessionIdValue,
    created_at: createdAtValue,
  };
}
export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  let decoded: {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = decodeJwtPayload(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.todo_app_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowString = toISOStringSafe(now);
  const accessExpiresString = toISOStringSafe(accessExpiresAt);
  const refreshExpiresString = toISOStringSafe(refreshExpiresAt);
  const access = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.todo_app_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });
  return {
    id: guest.id,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresString,
      refreshable_until: refreshExpiresString,
    } satisfies IAuthorizationToken,
  } satisfies ITodoAppGuest.IAuthorized;
}
