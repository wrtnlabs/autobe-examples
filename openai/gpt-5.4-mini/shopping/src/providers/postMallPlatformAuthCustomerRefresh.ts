import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthCustomerRefresh(props: {
  body: IMallPlatformCustomer.IRefresh;
}): Promise<IMallPlatformCustomer.IAuthorized> {
  const decodedUnknown: unknown = (() => {
    try {
      return jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  if (typeof decodedUnknown !== "object" || decodedUnknown === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const hasStringProperty = (
    value: object,
    key: string,
  ): value is Record<string, string> =>
    Object.prototype.hasOwnProperty.call(value, key) &&
    typeof (value as Record<string, unknown>)[key] === "string";
  if (!Object.prototype.hasOwnProperty.call(decodedUnknown, "type")) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!Object.prototype.hasOwnProperty.call(decodedUnknown, "id")) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (!Object.prototype.hasOwnProperty.call(decodedUnknown, "session_id")) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const decodedRecord = decodedUnknown as Record<string, unknown>;
  const tokenType = decodedRecord.type;
  const tokenId = decodedRecord.id;
  const tokenSessionId = decodedRecord.session_id;
  if (tokenType !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  if (typeof tokenId !== "string" || typeof tokenSessionId !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const customerId = tokenId;
  const sessionId = tokenSessionId;
  const session =
    await MyGlobal.prisma.mall_platform_customer_sessions.findFirst({
      where: {
        id: sessionId,
        mall_platform_customer_id: customerId,
      },
      select: {
        id: true,
        mall_platform_customer_id: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const customer =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (customer.deleted_at !== null || customer.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const tokenCreatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.mall_platform_customer_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: new Date(refreshableUntil),
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
    token: {
      access: jwt.sign(
        {
          type: "customer",
          id: customerId,
          session_id: sessionId,
          created_at: tokenCreatedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
          expiresIn: "1h",
        },
      ),
      refresh: jwt.sign(
        {
          type: "customer",
          id: customerId,
          session_id: sessionId,
          created_at: tokenCreatedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
          expiresIn: "7d",
        },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    } satisfies IAuthorizationToken,
  } satisfies IMallPlatformCustomer.IAuthorized;
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
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthCustomerRefresh(props: {
//   body: IMallPlatformCustomer.IRefresh;
// }): Promise<IMallPlatformCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------