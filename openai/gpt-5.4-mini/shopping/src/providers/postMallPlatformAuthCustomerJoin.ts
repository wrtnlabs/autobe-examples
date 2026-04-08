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
import { MallPlatformCustomerProfileTransformer } from "../transformers/MallPlatformCustomerProfileTransformer";
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
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const customerId = v4();
  const profileId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const customer = await MyGlobal.prisma.mall_platform_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      status: "active",
      password_hash: passwordHash,
      created_at: new Date(createdAt),
      updated_at: new Date(createdAt),
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
  const profile = await MyGlobal.prisma.mall_platform_customer_profiles.create({
    data: {
      id: profileId,
      mall_platform_customer_id: customer.id,
      display_name: props.body.email,
      phone_number: props.ip,
      created_at: new Date(createdAt),
      updated_at: new Date(createdAt),
      deleted_at: null,
    },
    ...MallPlatformCustomerProfileTransformer.select(),
  });
  return {
    id: customer.id,
    email: customer.email,
    status: customer.status,
    profile: await MallPlatformCustomerProfileTransformer.transform(profile),
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    token: {
      access: jwt.sign(
        {
          type: "customer",
          id: customer.id,
          session_id: sessionId,
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: "customer",
          id: customer.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: createdAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
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
// import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAuthCustomerJoin(props: {
//   ip: string;
//   body: IMallPlatformCustomer.IJoin;
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