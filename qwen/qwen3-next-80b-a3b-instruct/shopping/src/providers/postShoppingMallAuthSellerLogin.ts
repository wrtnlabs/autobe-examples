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

export async function postShoppingMallAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
  ip: string;
  href: string;
  referrer: string;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // 1. Extract email and password from the body after type assertion
  const body = props.body as {
    email: string;
    password: string;
  };
  // Validate presence of email and password
  if (!body.email || !body.password) {
    throw new HttpException("Login credentials not provided", 401);
  }
  // 2. Find seller with password_hash
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
      approval_status: "approved",
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!seller) throw new HttpException("Invalid credentials", 401);
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    body.password,
    seller.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 4. Create new session using props.ip, props.href, props.referrer
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: seller.id,
      ip: props.ip,
      href: props.href,
      referrer: props.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "seller" as const,
        id: seller.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "seller" as const,
        id: seller.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh" as const,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Return IAuthorized
  return {
    token,
  } satisfies IShoppingMallSeller.IAuthorized;
}
