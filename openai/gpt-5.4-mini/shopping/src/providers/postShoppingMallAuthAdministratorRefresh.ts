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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdministratorRefresh(props: {
  body: IShoppingMallAdministrator.IRefresh;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const verified: unknown = jwt.verify(
    props.body.refresh,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );
  if (typeof verified !== "object" || verified === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!("type" in verified) || verified.type !== "administrator") {
    throw new HttpException("Invalid token type", 403);
  }
  if (!("id" in verified) || typeof verified.id !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!("session_id" in verified) || typeof verified.session_id !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findFirst({
      where: {
        id: verified.session_id,
        shopping_mall_administrator_id: verified.id,
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
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: verified.id,
      },
      select: {
        id: true,
        email: true,
        grade: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (administrator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now: number = Date.now();
  const accessExpiredAt: string = toISOStringSafe(
    new Date(now + 60 * 60 * 1000),
  );
  const refreshableUntil: string = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const issuedAt: string = toISOStringSafe(new Date(now));
  const accessToken: string = jwt.sign(
    {
      type: "administrator",
      id: verified.id,
      session_id: verified.session_id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "administrator",
      id: verified.id,
      session_id: verified.session_id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.shopping_mall_administrator_sessions.update({
    where: {
      id: verified.session_id,
    },
    data: {
      expired_at: new Date(refreshableUntil),
    },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    accountStatus: administrator.account_status,
    createdAt: toISOStringSafe(administrator.created_at),
    updatedAt: toISOStringSafe(administrator.updated_at),
    deletedAt:
      administrator.deleted_at === null
        ? null
        : toISOStringSafe(administrator.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
