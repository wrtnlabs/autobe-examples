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
  const existing = await MyGlobal.prisma.shopping_mall_administrators.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: props.body.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresStr = accessExpires.toISOString() as string &
    tags.Format<"date-time">;
  const refreshExpiresStr = refreshExpires.toISOString() as string &
    tags.Format<"date-time">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "administrator",
      id: administrator.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const accessTokenHash = await PasswordUtil.hash(accessToken);
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);
  await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
    data: {
      id: sessionId,
      administrator_id: administrator.id,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiresStr,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };
  return {
    ...(await ShoppingMallAdministratorTransformer.transform(administrator)),
    token,
  } satisfies IShoppingMallAdministrator.IAuthorized;
}
