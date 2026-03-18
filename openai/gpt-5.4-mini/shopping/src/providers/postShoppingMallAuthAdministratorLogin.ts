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

export async function postShoppingMallAuthAdministratorLogin(props: {
  ip: string;
  body: IShoppingMallAdministrator.ILogin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        email: props.body.email,
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
        password_hash: true,
      },
    });
  if (administrator === null)
    throw new HttpException("Invalid credentials", 401);
  if (administrator.account_status !== "active")
    throw new HttpException("Invalid credentials", 401);
  if (
    (await PasswordUtil.verify(
      props.body.password,
      administrator.password_hash,
    )) === false
  )
    throw new HttpException("Invalid credentials", 401);
  const now: string = toISOStringSafe(new Date());
  const expiredAt: string = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil: string = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_administrator_id: administrator.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: refreshableUntil,
    },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    accountStatus: administrator.account_status,
    createdAt: administrator.created_at.toISOString(),
    updatedAt: administrator.updated_at.toISOString(),
    deletedAt:
      administrator.deleted_at === null
        ? null
        : administrator.deleted_at.toISOString(),
    token: {
      access: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: sessionId,
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
