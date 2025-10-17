import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IShoppingMallGuest.ICreate;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const { body } = props;

  const existingGuest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: {
      session_token: body.session_token,
      deleted_at: null,
    },
  });

  const now = toISOStringSafe(new Date());

  let guestRecord;

  if (existingGuest) {
    guestRecord = existingGuest;
  } else {
    guestRecord = await MyGlobal.prisma.shopping_mall_guests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        session_token: body.session_token,
        ip_address: body.ip_address ?? null,
        user_agent: body.user_agent ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }

  const payload = {
    id: guestRecord.id,
    type: "guest" as const,
  };

  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    {
      id: guestRecord.id,
      type: "guest" as const,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: guestRecord.id,
    session_token: guestRecord.session_token,
    ip_address: guestRecord.ip_address ?? null,
    user_agent: guestRecord.user_agent ?? null,
    created_at: toISOStringSafe(guestRecord.created_at),
    updated_at: toISOStringSafe(guestRecord.updated_at),
    deleted_at: guestRecord.deleted_at
      ? toISOStringSafe(guestRecord.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
