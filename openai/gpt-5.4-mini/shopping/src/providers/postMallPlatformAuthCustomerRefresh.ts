import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
  const decodedUnknown: unknown = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
  if (!isObject(decodedUnknown)) throw new HttpException("Unauthorized", 401);
  if (typeof decodedUnknown.id !== "string")
    throw new HttpException("Forbidden", 403);
  if (typeof decodedUnknown.session_id !== "string")
    throw new HttpException("Forbidden", 403);
  if (decodedUnknown.type !== "customer")
    throw new HttpException("Forbidden", 403);
  const session =
    await MyGlobal.prisma.mall_platform_customer_sessions.findFirst({
      where: {
        id: decodedUnknown.session_id,
        mall_platform_customer_id: decodedUnknown.id,
      },
      select: {
        id: true,
        mall_platform_customer_id: true,
        expired_at: true,
      },
    });
  if (session === null) throw new HttpException("Unauthorized", 401);
  const customer =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: { id: decodedUnknown.id },
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (customer.deleted_at !== null) throw new HttpException("Forbidden", 403);
  const now = new Date();
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nowIso = toISOStringSafe(now);
  const accessExpiredAtIso = toISOStringSafe(accessExpiredAt);
  const refreshableUntilIso = toISOStringSafe(refreshableUntil);
  await MyGlobal.prisma.mall_platform_customer_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshableUntil,
    },
  });
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    profile: undefined,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
    token: {
      access: jwt.sign(
        {
          type: "customer",
          id: decodedUnknown.id,
          session_id: decodedUnknown.session_id,
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe", expiresIn: "1h" },
      ),
      refresh: jwt.sign(
        {
          type: "customer",
          id: decodedUnknown.id,
          session_id: decodedUnknown.session_id,
          created_at: nowIso,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { issuer: "autobe", expiresIn: "7d" },
      ),
      expired_at: accessExpiredAtIso,
      refreshable_until: refreshableUntilIso,
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
// import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthCustomerRefresh(props: {
//   body: IMallPlatformCustomer.IRefresh;
// }): Promise<IMallPlatformCustomer.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     status: ...,
//     profile: await MallPlatformCustomerProfileTransformer.transform(...),
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------