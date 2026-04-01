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
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "superAdministrator") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_super_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        super_administrator_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_administrators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresStr = toISOStringSafe(accessExpires) as string &
    tags.Format<"date-time">;
  const refreshExpiresStr = toISOStringSafe(refreshExpires) as string &
    tags.Format<"date-time">;
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  await MyGlobal.prisma.shopping_mall_super_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
      expired_at: refreshExpires,
    },
  });
  return {
    id: superAdmin.id as string & tags.Format<"uuid">,
    email: superAdmin.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(superAdmin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(superAdmin.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      superAdmin.deleted_at === null
        ? null
        : (toISOStringSafe(superAdmin.deleted_at) as string &
            tags.Format<"date-time">),
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
