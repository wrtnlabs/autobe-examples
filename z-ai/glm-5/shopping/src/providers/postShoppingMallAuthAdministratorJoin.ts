import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
  body: IShoppingMallAdministrator.IJoin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_administrators.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create administrator with hashed password
  const administratorId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.create({
      data: {
        id: administratorId,
        email: props.body.email,
        password_hash: passwordHash,
        grade: "regular",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  // 3. Create session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
    data: {
      id: sessionId,
      administrator_id: administratorId,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: sessionId,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized response
  return {
    ...(await ShoppingMallAdministratorTransformer.transform(administrator)),
    token,
  } satisfies IShoppingMallAdministrator.IAuthorized;
}
