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
import { ShoppingMallSuperAdministratorTransformer } from "../transformers/ShoppingMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdministratorJoin(props: {
  ip: string;
  body: IShoppingMallSuperAdministrator.IJoin;
}): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
  const normalizedEmail: string = props.body.email.trim().toLowerCase();
  const existing =
    await MyGlobal.prisma.shopping_mall_super_administrators.findFirst({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const actorId: string = v4();
  const sessionId: string = v4();
  const createdAtValue = new globalThis.Date();
  const expiredAtValue = new globalThis.Date(
    createdAtValue.getTime() + 60 * 60 * 1000,
  );
  const refreshableUntilValue = new globalThis.Date(
    createdAtValue.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const createdAt: string & tags.Format<"date-time"> =
    createdAtValue.toISOString();
  const expiredAt: string & tags.Format<"date-time"> =
    expiredAtValue.toISOString();
  const refreshableUntil: string & tags.Format<"date-time"> =
    refreshableUntilValue.toISOString();
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const actor = await tx.shopping_mall_super_administrators.create({
      data: {
        id: actorId,
        email: normalizedEmail,
        password_hash: passwordHash,
        active: true,
        created_at: createdAtValue,
        updated_at: createdAtValue,
        deleted_at: null,
      },
      ...ShoppingMallSuperAdministratorTransformer.select(),
    });
    const session = await tx.shopping_mall_super_administrator_sessions.create({
      data: {
        id: sessionId,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: createdAtValue,
        expired_at: expiredAtValue,
        superAdministrator: {
          connect: {
            id: actorId,
          },
        },
      },
      select: {
        id: true,
      },
    });
    return {
      actor,
      session,
    };
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "superadministrator",
        id: created.actor.id,
        session_id: created.session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "superadministrator",
        id: created.actor.id,
        session_id: created.session.id,
        tokenType: "refresh",
        created_at: createdAt,
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
    ...(await ShoppingMallSuperAdministratorTransformer.transform(
      created.actor,
    )),
    token,
  } satisfies IShoppingMallSuperAdministrator.IAuthorized;
}
