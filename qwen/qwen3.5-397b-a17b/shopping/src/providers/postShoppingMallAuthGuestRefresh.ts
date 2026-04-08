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

function isGuestJwtPayload(payload: unknown): payload is {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "guest";
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.session_id !== "string" ||
    typeof record.type !== "string"
  ) {
    return false;
  }
  return record.type === "guest";
}
export async function postShoppingMallAuthGuestRefresh(props: {
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  let decoded: unknown;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!isGuestJwtPayload(decoded)) {
    throw new HttpException("Invalid token payload", 401);
  }
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  const guest = await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "24h", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      ...(props.body.ip !== undefined && { ip: props.body.ip }),
      ...(props.body.href !== undefined && { href: props.body.href }),
      ...(props.body.referrer !== undefined && {
        referrer: props.body.referrer,
      }),
      expired_at: refreshExpiresAt,
    },
  });
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: null,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
