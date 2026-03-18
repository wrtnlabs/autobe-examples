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

export async function postShoppingMallAuthAdministratorJoin(props: {
  ip: string;
  body: IShoppingMallAdministrator.IJoin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const existed = await MyGlobal.prisma.shopping_mall_administrators.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existed !== null)
    throw new HttpException("Administrator email already exists.", 409);
  const now = new Date();
  const createdAt = now.toISOString();
  const accessExpiredAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiredAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const administratorId = v4();
  const sessionId = v4();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const administrator = await tx.shopping_mall_administrators.create({
      data: {
        id: administratorId,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        grade: "regular",
        account_status: "active",
        created_at: new Date(createdAt),
        updated_at: new Date(createdAt),
        deleted_at: null,
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
    const session = await tx.shopping_mall_administrator_sessions.create({
      data: {
        id: sessionId,
        shopping_mall_administrator_id: administrator.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(createdAt),
        expired_at: new Date(refreshExpiredAt),
      },
      select: { id: true },
    });
    return { administrator, session };
  });
  return {
    id: result.administrator.id,
    email: result.administrator.email,
    grade: result.administrator.grade,
    accountStatus: result.administrator.account_status,
    createdAt: result.administrator.created_at.toISOString(),
    updatedAt: result.administrator.updated_at.toISOString(),
    deletedAt:
      result.administrator.deleted_at === null
        ? null
        : result.administrator.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "administrator",
          id: result.administrator.id,
          session_id: result.session.id,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "administrator",
          id: result.administrator.id,
          session_id: result.session.id,
          tokenType: "refresh",
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
