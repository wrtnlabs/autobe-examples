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

export async function postShoppingMallAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // 1. Verify refresh token
  const raw = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });
  if (typeof raw !== "object" || raw === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Narrow claims without `as` — explicit typeof guards
  const rawType = raw.type;
  if (typeof rawType !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const rawId = raw.id;
  if (typeof rawId !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const rawSessionId = raw.session_id;
  if (typeof rawSessionId !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const decodedType: string = rawType;
  const decodedId: string = rawId;
  const decodedSessionId: string = rawSessionId;
  // 3. Validate token type
  if (decodedType !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  // 4. Validate session exists and is active
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: decodedSessionId,
        shopping_mall_customer_id: decodedId,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at < new Date()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate customer account
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: decodedId },
    });
  // 6. Check banned status — terminate session, return 403
  if (customer.banned_at !== null) {
    await MyGlobal.prisma.shopping_mall_customer_sessions.update({
      where: { id: decodedSessionId },
      data: { expired_at: new Date() },
    });
    throw new HttpException("Account has been banned", 403);
  }
  // 7. Check deleted status — terminate session, return 401
  if (customer.deleted_at !== null) {
    await MyGlobal.prisma.shopping_mall_customer_sessions.update({
      where: { id: decodedSessionId },
      data: { expired_at: new Date() },
    });
    throw new HttpException("Account has been deleted", 401);
  }
  // 8. Generate new tokens (SAME session_id — session continuity)
  const now = new Date();
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: decodedSessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: decodedSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Extend session expiry
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: decodedSessionId },
    data: { expired_at: refreshExpires },
  });
  // 10. Build IAuthorized response
  return {
    id: customer.id,
    email: customer.email,
    display_name: customer.display_name,
    phone_number: customer.phone_number,
    banned_at: null,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IShoppingMallCustomer.IAuthorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAuthCustomerRefresh(props: {
//   body: IShoppingMallCustomer.IRefresh;
// }): Promise<IShoppingMallCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------