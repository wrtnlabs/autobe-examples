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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Verify refresh token existence and validity
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: { id: props.body.refresh_token }, // Correct field name 'id' from schema
    });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Verify session not expired (expired_at > now)
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const sessionExpiredAt = session.expired_at.toISOString() as string &
    tags.Format<"date-time">;
  if (sessionExpiredAt <= now) {
    throw new HttpException("Refresh token expired", 401);
  }
  // 3. Validate customer account is not deleted
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: session.shopping_mall_customer_id },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Generate new access token (30-minute TTL)
  const accessExpires = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshableUntil = session.expired_at.toISOString() as string &
    tags.Format<"date-time">;
  const token = jwt.sign(
    {
      type: "customer",
      id: customer.id as string & tags.Format<"uuid">,
      session_id: session.id as string & tags.Format<"uuid">,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  // 5. Return authorized response with new access token
  return {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email,
    display_name: customer.display_name ?? undefined,
    phone_number: customer.phone_number ?? undefined,
    created_at: customer.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: customer.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    token: {
      access: token,
      refresh: props.body.refresh_token, // unchanged
      expired_at: accessExpires,
      refreshable_until: refreshableUntil,
    },
  };
}
