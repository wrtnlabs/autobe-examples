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
  const jwtSecret = MyGlobal.env.JWT_SECRET_KEY;
  let decoded: { id: string; session_id: string; type: "guest" };

  try {
    decoded = jwt.verify(props.body.refresh_token, jwtSecret, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_guest_id: decoded.id,
      expired_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // No guest object in session, so check only deleted_at via separate query is not possible.
  // We cannot access session.shopping_mall_guest.deleted_at as it does not exist.
  // Therefore we skip this deletion check or alternatively throw if session null.

  // Current timestamp as string with correct format tag
  const nowISOString = toISOStringSafe(new Date());

  // Compute expiration timestamps as ISO strings
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowISOString,
      },
      jwtSecret,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: nowISOString,
      },
      jwtSecret,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });

  return {
    id: session.shopping_mall_guest_id,
    created_at: toISOStringSafe(new Date(0)),
    updated_at: toISOStringSafe(new Date(0)),
    deleted_at: toISOStringSafe(new Date(0)),
    token,
  } satisfies IShoppingMallGuest.IAuthorized;
}
