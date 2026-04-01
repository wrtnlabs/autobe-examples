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

export async function postShoppingMallAuthGuestRefresh(props: {
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const tokenCandidates = Object.values(props.body);
  const refreshToken = tokenCandidates.find(
    (v) => typeof v === "string" && v.length > 0,
  );
  if (typeof refreshToken !== "string") {
    throw new HttpException("Invalid refresh request", 400);
  }
  const verified = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });
  if (
    typeof verified !== "object" ||
    verified === null ||
    Array.isArray(verified)
  ) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const payload = verified as Record<string, unknown>;
  const tokenType = payload["type"];
  const idRaw = payload["id"];
  const sessionIdRaw = payload["session_id"];
  if (
    tokenType !== "guest" ||
    typeof idRaw !== "string" ||
    typeof sessionIdRaw !== "string"
  ) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const accessExpiryMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiryMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiredAtIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(accessExpiryMs)),
  );
  const refreshableUntilIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(refreshExpiryMs)),
  );
  const now = new Date();
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: sessionIdRaw,
      deleted_at: null,
      expired_at: { gt: now },
      guest: {
        deleted_at: null,
        id: idRaw,
      },
    },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      updated_at: true,
      expired_at: true,
      deleted_at: true,
      guest: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: idRaw,
      session_id: sessionIdRaw,
      created_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(new Date()),
      ),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refreshTokenNew = jwt.sign(
    {
      type: "guest",
      id: idRaw,
      session_id: sessionIdRaw,
      tokenType: "refresh",
      created_at: typia.assert<string & tags.Format<"date-time">>(
        toISOStringSafe(new Date()),
      ),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: sessionIdRaw },
    data: {
      updated_at: new Date(),
      expired_at: new Date(refreshExpiryMs),
    },
  });
  return {
    id: session.guest.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(session.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(session.updated_at),
    ),
    expired_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(session.expired_at),
    ),
    deleted_at:
      session.deleted_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(session.deleted_at),
          ),
    token: {
      access: accessToken,
      refresh: refreshTokenNew,
      expired_at: accessExpiredAtIso,
      refreshable_until: refreshableUntilIso,
    },
  };
}
