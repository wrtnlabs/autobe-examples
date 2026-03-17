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

export async function postShoppingMallAuthAdministratorJoin(props: {
  ip: string;
  body: IShoppingMallAdministrator.IJoin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const email = props.body.email.trim().toLowerCase();
  const existing = await MyGlobal.prisma.shopping_mall_administrators.findFirst(
    {
      where: {
        email,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const nowText = new globalThis.Date().toISOString();
  const accessExpiredText = new globalThis.Date(
    globalThis.Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshableUntilText = new globalThis.Date(
    globalThis.Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const administratorId = v4();
  const sessionId = v4();
  const sessionIp = props.body.ip ?? props.ip;
  try {
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
      const administrator = await tx.shopping_mall_administrators.create({
        data: {
          id: administratorId,
          email,
          password_hash: passwordHash,
          active: true,
          banned: false,
          created_at: new globalThis.Date(nowText),
          updated_at: new globalThis.Date(nowText),
          deleted_at: null,
        },
        ...ShoppingMallAdministratorTransformer.select(),
      });
      await tx.shopping_mall_administrator_sessions.create({
        data: {
          id: sessionId,
          administrator: {
            connect: {
              id: administrator.id,
            },
          },
          ip: sessionIp,
          href: props.body.href,
          referrer: props.body.referrer,
          created_at: new globalThis.Date(nowText),
          expired_at: new globalThis.Date(accessExpiredText),
        },
      });
      const token = {
        access: jwt.sign(
          {
            type: "administrator",
            id: administrator.id,
            session_id: sessionId,
            created_at: nowText,
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
            created_at: nowText,
          },
          MyGlobal.env.JWT_SECRET_KEY,
          {
            expiresIn: "7d",
            issuer: "autobe",
          },
        ),
        expired_at: accessExpiredText,
        refreshable_until: refreshableUntilText,
      } satisfies IAuthorizationToken;
      return {
        administrator,
        token,
      };
    });
    return {
      ...(await ShoppingMallAdministratorTransformer.transform(
        result.administrator,
      )),
      token: result.token,
    } satisfies IShoppingMallAdministrator.IAuthorized;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpException("Email already registered", 409);
    throw error;
  }
}
