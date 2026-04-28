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
import { EcommercePlatformCustomerProfileTransformer } from "../transformers/EcommercePlatformCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformAuthCustomerLogin(props: {
  ip: string;
  body: IEcommercePlatformCustomer.ILogin;
}): Promise<IEcommercePlatformCustomer.IAuthorized> {
  // Find customer by email address
  const customer =
    await MyGlobal.prisma.ecommerce_platform_customers.findUnique({
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Check if account exists and is not soft-deleted
  if (customer === null || customer.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify account is not banned
  if (customer.is_banned === true) {
    throw new HttpException("Account is banned", 403);
  }
  // Verify password against stored hash
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Generate session UUID
  const sessionId: string & tags.Format<"uuid"> = v4();
  const sessionCreated: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const accessExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const refreshTokenHash: string = v4();
  // Create session record
  const session =
    await MyGlobal.prisma.ecommerce_platform_customer_sessions.create({
      data: {
        id: sessionId,
        ecommerce_platform_customer_id: customer.id,
        refresh_token_hash: refreshTokenHash,
        ip: props.ip,
        user_agent: "",
        created_at: new Date(sessionCreated),
        updated_at: new Date(sessionCreated),
        expired_at: new Date(refreshExpiresAt),
        deleted_at: null,
      },
    });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        created_at: sessionCreated,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: sessionCreated,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // Retrieve customer profile using transformer
  const profileResult =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirst({
      where: { ecommerce_platform_customer_id: customer.id },
      ...EcommercePlatformCustomerProfileTransformer.select(),
    });
  // Transform profile if it exists
  const customer_profile: IEcommercePlatformCustomerProfile | undefined =
    profileResult !== null
      ? await EcommercePlatformCustomerProfileTransformer.transform(
          profileResult,
        )
      : undefined;
  // Construct and return the authorized customer response
  return {
    id: customer.id,
    email: customer.email,
    is_banned: customer.is_banned,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    deleted_at: null,
    customer_profile,
    token,
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
// export async function postEcommercePlatformAuthCustomerLogin(props: {
//   ip: string;
//   body: IEcommercePlatformCustomer.ILogin;
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