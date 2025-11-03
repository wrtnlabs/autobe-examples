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

  const guestId: string & tags.Format<"uuid"> = v4();

  const newGuest = await MyGlobal.prisma.shopping_mall_guests.create({
    data: {
      id: guestId,
      ip: body.ip,
      created_at: body.created_at,
    },
  });

  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const now = toISOStringSafe(new Date());

  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: newGuest.id,
        session_id: newGuest.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: newGuest.id,
        session_id: newGuest.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: newGuest.id,
    token,
    expires_at: accessExpires,
  };
}
