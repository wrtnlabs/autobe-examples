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

export async function postMultiUserTodoAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoGuest.IJoin;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  const deviceFingerprint = props.body.deviceFingerprint;
  if (deviceFingerprint.length < 1)
    throw new HttpException("Invalid device fingerprint", 400);
  const nowIso = new Date().toISOString();
  const accessExpiresIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshableUntilIso = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const guest = await tx.multi_user_todo_guests.upsert({
      where: { device_fingerprint: deviceFingerprint },
      create: {
        id: v4(),
        device_fingerprint: deviceFingerprint,
        created_at: nowIso as any,
        updated_at: nowIso as any,
        deleted_at: null,
      },
      update: { updated_at: nowIso as any, deleted_at: null },
    });
    const session = await tx.multi_user_todo_guest_sessions.create({
      data: {
        id: v4(),
        multi_user_todo_guest_id: guest.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: nowIso as any,
        updated_at: nowIso as any,
        deleted_at: null,
        expired_at: accessExpiresIso as any,
      },
    });
    const payloadBase = {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: nowIso,
    };
    const access = jwt.sign(payloadBase, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    });
    const refresh = jwt.sign(
      { ...payloadBase, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    return {
      id: guest.id,
      token: {
        access,
        refresh,
        expired_at: accessExpiresIso,
        refreshable_until: refreshableUntilIso,
      },
    };
  });
}
