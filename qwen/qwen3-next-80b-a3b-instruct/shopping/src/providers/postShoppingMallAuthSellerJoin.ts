import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerJoin(props: {
  body: IShoppingMallSeller.IJoin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create seller record with required id and created_at
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const seller = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(), // required by schema
      email: props.body.email,
      password_hash: passwordHash,
      status: "pending",
      is_active: true,
      created_at: new Date().toISOString(), // required by schema
    },
  });
  // 3. Generate tokens with compliant date-time strings
  const now = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  const accessExpires = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  );
  const refreshExpires = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const accessPayload = {
    type: "seller", // static
    id: seller.id as string & tags.Format<"uuid">, // from Prisma
    session_id: null, // no session created yet - per spec
    created_at: now,
  };
  const refreshPayload = {
    type: "seller", // static
    id: seller.id as string & tags.Format<"uuid">, // from Prisma
    session_id: null, // no session created yet - per spec
    tokenType: "refresh", // static
    created_at: now,
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 4. Return IAuthorized - seller properties + token
  return {
    id: seller.id as string & tags.Format<"uuid">,
    token,
    expired_at: accessExpires,
  } satisfies IShoppingMallSeller.IAuthorized;
}
