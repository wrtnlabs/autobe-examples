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
  const email: string = props.body.email.trim().toLowerCase();
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirst({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        active: true,
        banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (administrator === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (
    administrator.deleted_at !== null ||
    administrator.active === false ||
    administrator.banned === true
  ) {
    throw new HttpException("Invalid credentials", 401);
  }
  const verified: boolean = await PasswordUtil.verify(
    props.body.password,
    administrator.password_hash,
  );
  if (verified === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(toISOStringSafe(new Date()));
  const expiredAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)));
  const refreshableUntil: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
    data: {
      id: sessionId,
      administrator: {
        connect: {
          id: administrator.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: expiredAt,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
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
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: administrator.id,
    email: administrator.email,
    active: administrator.active,
    banned: administrator.banned,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(administrator.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(administrator.updated_at),
    ),
    deleted_at: null,
    token,
  };
}
