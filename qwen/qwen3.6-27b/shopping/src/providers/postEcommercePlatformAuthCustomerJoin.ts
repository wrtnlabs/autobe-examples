import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformCustomerTransformer } from "../transformers/EcommercePlatformCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformAuthCustomerJoin(props: {
  ip: string;
  body: IEcommercePlatformCustomer.IJoin;
}): Promise<IEcommercePlatformCustomer.IAuthorized> {
  // Check email uniqueness across customer and seller accounts
  const existingCustomer =
    await MyGlobal.prisma.ecommerce_platform_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }
  const existingSeller =
    await MyGlobal.prisma.ecommerce_platform_sellers.findFirst({
      where: { email: props.body.email },
    });
  if (existingSeller) {
    throw new HttpException("Email already registered", 409);
  }
  const customerId = v4();
  const profileId = v4();
  const sessionId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Generate refresh token and hash it for session storage
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);
  // Generate access token
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Create customer, profile, and session atomically
  const result = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_platform_customers.create({
      data: {
        id: customerId,
        email: props.body.email,
        password_hash: passwordHash,
        is_banned: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.ecommerce_platform_customer_profiles.create({
      data: {
        id: profileId,
        ecommerce_platform_customer_id: customerId,
        display_name: "",
        phone_number: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.ecommerce_platform_customer_sessions.create({
      data: {
        id: sessionId,
        ecommerce_platform_customer_id: customerId,
        refresh_token_hash: refreshTokenHash,
        ip: props.body.ip ?? props.ip,
        user_agent: "",
        expired_at: refreshExpiresAt,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
  ]);
  // Fetch the created customer with profile for response transformation
  const customerWithProfile =
    await MyGlobal.prisma.ecommerce_platform_customers.findUniqueOrThrow({
      where: { id: customerId },
      ...EcommercePlatformCustomerTransformer.select(),
    });
  const transformed =
    await EcommercePlatformCustomerTransformer.transform(customerWithProfile);
  return {
    ...transformed,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  } satisfies IEcommercePlatformCustomer.IAuthorized;
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
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformAuthCustomerJoin(props: {
//   ip: string;
//   body: IEcommercePlatformCustomer.IJoin;
// }): Promise<IEcommercePlatformCustomer.IAuthorized> {
//   return {
//     created_at: ...,
//     customer_profile: await EcommercePlatformCustomerProfileTransformer.transform(...),
//     deleted_at: ...,
//     email: ...,
//     id: ...,
//     is_banned: ...,
//     updated_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------