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

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const { body } = props;

  let decoded: { id: string; type: string };

  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as { id: string; type: string };
  } catch {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Unauthorized: Token is not for a guest user", 401);
  }

  const guest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: {
      id: decoded.id as string & tags.Format<"uuid">,
      deleted_at: null,
    },
  });

  if (!guest) {
    throw new HttpException(
      "Unauthorized: Guest session not found or deleted",
      401,
    );
  }

  const now = new Date();
  const accessExpireTime = new Date(now.getTime() + 3600000); // 1 hour
  const refreshExpireTime = new Date(now.getTime() + 604800000); // 7 days

  const accessToken = jwt.sign(
    { id: guest.id, type: "guest" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );

  const refreshToken = jwt.sign(
    { id: guest.id, type: "guest" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );

  return {
    id: guest.id,
    session_token: guest.session_token,
    ip_address: guest.ip_address ?? null,
    user_agent: guest.user_agent ?? null,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpireTime),
      refreshable_until: toISOStringSafe(refreshExpireTime),
    },
  };
}
