import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  const { guest, body } = props;
  const { refresh_token } = body;

  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid refresh token", 401);
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid refresh token", 401);
  }

  const decodedAny = decoded as Record<string, unknown>;
  const decodedId =
    typeof decodedAny.id === "string" ? decodedAny.id : undefined;
  const decodedType =
    typeof decodedAny.type === "string" ? decodedAny.type : undefined;

  if (!decodedId || decodedType !== "guest") {
    throw new HttpException("Invalid refresh token", 401);
  }

  if (guest && guest.id && guest.id !== decodedId) {
    throw new HttpException("Invalid refresh token for this guest", 401);
  }

  const guestRecord = await MyGlobal.prisma.todo_app_guest.findUnique({
    where: { id: decodedId },
  });

  if (!guestRecord) {
    throw new HttpException("Guest not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const accessExpiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  await MyGlobal.prisma.todo_app_guest.update({
    where: { id: guestRecord.id },
    data: { last_active_at: now },
  });

  try {
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4(),
        actor_role: "guest",
        action_type: "refresh_token",
        target_resource: "guest",
        target_id: guestRecord.id,
        created_at: now,
      },
    });
  } catch {
    // Audit failure should not block token issuance
  }

  const access = jwt.sign(
    { id: guestRecord.id, type: "guest" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    { id: guestRecord.id, type: "guest", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: guestRecord.id,
    email: guestRecord.email ?? null,
    created_at: toISOStringSafe(guestRecord.created_at),
    last_active_at: now,
    status: guestRecord.status ?? undefined,
    token: {
      access,
      refresh,
      expired_at: accessExpiry,
      refreshable_until: refreshExpiry,
    },
  };
}
