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
  body: ITodoListGuest.IRefresh;
}): Promise<ITodoListGuest.IAuthorized> {
  const { guest, body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 403);
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("guestId" in decoded) ||
    typeof (decoded as Record<string, unknown>).guestId !== "string" ||
    !("tokenType" in decoded) ||
    (decoded as Record<string, unknown>).tokenType !== "refresh"
  ) {
    throw new HttpException("Invalid refresh token payload", 403);
  }

  const guestId = (decoded as Record<string, unknown>).guestId as string &
    tags.Format<"uuid">;

  const guestRecord = await MyGlobal.prisma.todo_list_guests.findFirst({
    where: {
      id: guestId,
      deleted_at: null,
    },
  });

  if (!guestRecord) {
    throw new HttpException("Guest not found or deleted", 403);
  }

  const accessPayload = {
    guestId: guestRecord.id,
    tokenType: "access",
    sub: guestRecord.id,
  };

  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshPayload = {
    guestId: guestRecord.id,
    tokenType: "refresh",
  };

  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  const nowMs = Date.now();

  const expiredAt = toISOStringSafe(new Date(nowMs + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 3600 * 1000),
  );

  return {
    id: guestRecord.id,
    nickname: guestRecord.nickname,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
    created_at: toISOStringSafe(guestRecord.created_at),
    updated_at: toISOStringSafe(guestRecord.updated_at),
  };
}
