import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdministratorRefresh(props: {
  body: IShoppingMallSuperAdministrator.IRefresh;
}): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
  let verified: unknown;
  try {
    verified = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof verified !== "object" || verified === null) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const verifiedPayload = verified as Record<string, unknown>;
  const verifiedType: unknown = verifiedPayload["type"];
  const verifiedId: unknown = verifiedPayload["id"];
  const verifiedSessionId: unknown = verifiedPayload["session_id"];
  if (
    verifiedType !== "superadministrator" ||
    typeof verifiedId !== "string" ||
    typeof verifiedSessionId !== "string"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_super_administrator_sessions.findFirst({
      where: {
        id: verifiedSessionId,
        shopping_mall_super_administrator_id: verifiedId,
      },
      select: {
        id: true,
        shopping_mall_super_administrator_id: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= globalThis.Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const actor =
    await MyGlobal.prisma.shopping_mall_super_administrators.findUniqueOrThrow({
      where: {
        id: verifiedId,
      },
      select: {
        id: true,
        email: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (actor.active === false) {
    throw new HttpException("Account is inactive", 403);
  }
  if (actor.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowMs: number = globalThis.Date.now();
  const accessExpiredAtMs: number = nowMs + 60 * 60 * 1000;
  const refreshableUntilMs: number = nowMs + 7 * 24 * 60 * 60 * 1000;
  const createdAt: string = toISOStringSafe(new globalThis.Date(nowMs));
  const accessExpiredAt: string = toISOStringSafe(
    new globalThis.Date(accessExpiredAtMs),
  );
  const refreshableUntil: string = toISOStringSafe(
    new globalThis.Date(refreshableUntilMs),
  );
  const access: string = jwt.sign(
    {
      type: "superadministrator",
      id: actor.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refresh: string = jwt.sign(
    {
      type: "superadministrator",
      id: actor.id,
      session_id: session.id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  await MyGlobal.prisma.shopping_mall_super_administrator_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      expired_at: new globalThis.Date(refreshableUntilMs),
    },
  });
  return {
    id: actor.id,
    email: actor.email,
    active: actor.active,
    created_at: toISOStringSafe(actor.created_at),
    updated_at: toISOStringSafe(actor.updated_at),
    deleted_at:
      actor.deleted_at === null ? null : toISOStringSafe(actor.deleted_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
