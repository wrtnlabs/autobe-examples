import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestJoin(props: {
  ip: string;
  body: IShoppingMallGuest.IJoin;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const refreshableUntilExpiresInHours = 24 * 7;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const guest = await tx.shopping_mall_guests.upsert({
      where: { fingerprint: props.body.fingerprint },
      create: {
        id: v4(),
        fingerprint: props.body.fingerprint,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    const session = await tx.shopping_mall_guest_sessions.create({
      data: {
        shopping_mall_guest_id: guest.id,
        ip: props.body.ip === null ? props.ip : props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        id: v4(),
        created_at: new Date(),
        updated_at: new Date(),
        expired_at: new Date(Date.now() + 60 * 60 * 1000),
        deleted_at: null,
      },
    });
    const accessJwtExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshableUntil = new Date(
      Date.now() + refreshableUntilExpiresInHours * 60 * 60 * 1000,
    );
    const createdAtIso = toISOStringSafe(session.created_at);
    const access = jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: createdAtIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );
    const refresh = jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAtIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    const token = {
      access,
      refresh,
      expired_at: toISOStringSafe(accessJwtExpires),
      refreshable_until: toISOStringSafe(refreshableUntil),
    } satisfies IAuthorizationToken;
    return {
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      updated_at: toISOStringSafe(session.updated_at),
      expired_at: toISOStringSafe(session.expired_at),
      deleted_at: null,
      token,
    } satisfies IShoppingMallGuest.IAuthorized;
  });
}
