import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
}): Promise<ITodoListGuest.IAuthorized> {
  let payload: GuestPayload;
  try {
    payload = jwt.verify(
      (props.guest as any).refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as unknown as GuestPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (payload.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { id: payload.id },
  });

  if (!user) {
    throw new HttpException("Guest user not found", 404);
  }

  const nowIso = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;

  const token = {
    access: jwt.sign(
      {
        type: payload.type,
        id: payload.id,
        session_id: payload.session_id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: payload.type,
        id: payload.id,
        session_id: payload.session_id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  return { id: payload.id, token };
}
