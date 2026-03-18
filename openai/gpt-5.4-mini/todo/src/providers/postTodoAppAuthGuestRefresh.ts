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

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  const guestSession = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      todo_app_guest_id: true,
      created_at: true,
      expired_at: true,
      updated_at: true,
      deleted_at: true,
      guest: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (guestSession === null) {
    throw new HttpException("Unauthorized", 401);
  }
  if (guestSession.deleted_at !== null) {
    throw new HttpException("Unauthorized", 401);
  }
  if (guestSession.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Unauthorized", 401);
  }
  if (guestSession.guest.deleted_at !== null) {
    throw new HttpException("Unauthorized", 401);
  }
  const now = new Date();
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const issuedAt = toISOStringSafe(now);
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestSession.todo_app_guest_id,
      session_id: guestSession.id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestSession.todo_app_guest_id,
      session_id: guestSession.id,
      created_at: issuedAt,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.todo_app_guest_sessions.update({
    where: {
      id: guestSession.id,
    },
    data: {
      expired_at: refreshableUntil,
      updated_at: now,
    },
  });
  return {
    id: guestSession.guest.id,
    created_at: toISOStringSafe(guestSession.guest.created_at),
    updated_at: toISOStringSafe(guestSession.guest.updated_at),
    deleted_at:
      guestSession.guest.deleted_at === null
        ? null
        : toISOStringSafe(guestSession.guest.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
    },
  };
}
