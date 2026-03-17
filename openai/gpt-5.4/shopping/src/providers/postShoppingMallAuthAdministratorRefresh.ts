import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdministratorRefresh(props: {
  body: IShoppingMallAdministrator.IRefresh;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const verified: unknown = (() => {
    try {
      return jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  if (
    typeof verified !== "object" ||
    verified === null ||
    Array.isArray(verified)
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  const payload = verified as {
    [key: string]: unknown;
  };
  const id: unknown = payload.id;
  const session_id: unknown = payload.session_id;
  const type: unknown = payload.type;
  const tokenType: unknown = payload.tokenType;
  if (
    typeof id !== "string" ||
    typeof session_id !== "string" ||
    typeof type !== "string"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  if (type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  if (tokenType !== undefined && tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  const now = toISOStringSafe(new Date()) satisfies string as string &
    tags.Format<"date-time">;
  const expired_at = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) satisfies string as string & tags.Format<"date-time">;
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) satisfies string as string & tags.Format<"date-time">;
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findFirst({
      where: {
        id: session_id,
        shopping_mall_administrator_id: id,
      },
      select: {
        id: true,
        shopping_mall_administrator_id: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (toISOStringSafe(session.expired_at) <= now) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id,
      },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  if (administrator.active === false) {
    throw new HttpException("Administrator account is inactive", 403);
  }
  if (administrator.banned === true) {
    throw new HttpException("Administrator account is banned", 403);
  }
  if (administrator.deleted_at !== null) {
    throw new HttpException("Administrator account has been deleted", 403);
  }
  const access: string = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "1h",
    },
  );
  const refresh: string = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );
  await MyGlobal.prisma.shopping_mall_administrator_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      expired_at: new Date(refreshable_until),
    },
  });
  return {
    ...(await ShoppingMallAdministratorTransformer.transform(administrator)),
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
