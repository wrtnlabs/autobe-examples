import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerJoin(props: {
  body: IShoppingMallCustomer.IJoin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Validate email format and uniqueness
  const body = typia.assert<
    IShoppingMallCustomer.IJoin & {
      email: string;
      password: string;
    }
  >(props.body);
  const existing = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: { email: body.email.toLowerCase(), deleted_at: null },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Generate UUIDs for customer and verification token
  const customerId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4();
  // 3. Create customer record with active=false and email_verified=false
  const createdCustomer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: customerId,
      email: body.email.toLowerCase(),
      password_hash: await PasswordUtil.hash(body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 4. Create email verification record with 24-hour expiry
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.shopping_mall_customer_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customerId,
      token: verificationToken,
      expires_at: toISOStringSafe(expiresAt),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // 5. Generate authentication tokens
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: customerId, // TODO: Fix this - should be session Id, not customer Id
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: customerId, // TODO: Fix this - should be session Id
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return { token } satisfies IShoppingMallCustomer.IAuthorized;
}
