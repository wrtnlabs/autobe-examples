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

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: ITodoListGuest.ICreate;
}): Promise<ITodoListGuest.IAuthorized> {
  const { body } = props;

  // Check duplicate nickname
  const existing = await MyGlobal.prisma.todo_list_guests.findFirst({
    where: { nickname: body.nickname, deleted_at: null },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Nickname already in use", 409);
  }

  // Prepare timestamps as ISO strings
  const now = toISOStringSafe(new Date());

  // Create new guest record
  const newId = v4();

  const created = await MyGlobal.prisma.todo_list_guests.create({
    data: {
      id: newId,
      nickname: body.nickname,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      nickname: true,
      created_at: true,
      updated_at: true,
    },
  });

  // Prepare token payload (GuestPayload)
  const payload = {
    id: created.id,
    type: "guest",
  };

  // Generate access token
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Calculate expiration times as ISO strings
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Return response matching ITodoListGuest.IAuthorized
  return {
    id: created.id,
    nickname: created.nickname,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
