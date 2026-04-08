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

export async function postMallPlatformAuthCustomerJoin(props: {
  ip: string;
  body: IMallPlatformCustomer.IJoin;
}): Promise<IMallPlatformCustomer.IAuthorized> {
  const existing = await MyGlobal.prisma.mall_platform_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const createdAt = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const customer = await MyGlobal.prisma.mall_platform_customers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const session = await MyGlobal.prisma.mall_platform_customer_sessions.create({
    data: {
      id: v4(),
      customer: {
        connect: {
          id: customer.id,
        },
      },
      ip: props.ip,
      href: props.ip,
      referrer: props.ip,
      expired_at: expiredAt,
      created_at: createdAt,
    },
    select: {
      id: true,
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    token: {
      access: jwt.sign(
        {
          type: "customer",
          id: customer.id,
          session_id: session.id,
          created_at: createdAt,
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
          id: customer.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          issuer: "autobe",
          expiresIn: "7d",
        },
      ),
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
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
// export async function postMallPlatformAuthCustomerJoin(props: {
//   ip: string;
//   body: IMallPlatformCustomer.IJoin;
// }): Promise<IMallPlatformCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------