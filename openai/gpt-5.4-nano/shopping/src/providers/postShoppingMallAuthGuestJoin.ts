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
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    const guest = await tx.shopping_mall_guests.upsert({
      where: { fingerprint: props.body.fingerprint },
      update: {
        updated_at: toISOStringSafe(new Date()),
      },
      create: {
        id: v4(),
        fingerprint: props.body.fingerprint,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    const accessExpires = toISOStringSafe(
      new Date(Date.now() + 60 * 60 * 1000),
    );
    const refreshExpires = toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    const session = await tx.shopping_mall_guest_sessions.create({
      data: {
        id: v4(),
        shopping_mall_guest_id: guest.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        updated_at: now,
        expired_at: accessExpires,
        deleted_at: null,
      },
    });
    const jwtCreatedAt = now;
    const access = jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: jwtCreatedAt,
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
        created_at: jwtCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    const token: IAuthorizationToken = {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    };
    return {
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      updated_at: toISOStringSafe(session.updated_at),
      expired_at: toISOStringSafe(session.expired_at),
      deleted_at: session.deleted_at
        ? toISOStringSafe(session.deleted_at)
        : null,
      token,
    } satisfies IShoppingMallGuest.IAuthorized;
  });
}
