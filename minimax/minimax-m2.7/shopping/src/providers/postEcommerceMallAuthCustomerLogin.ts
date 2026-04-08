import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCustomerTransformer } from "../transformers/EcommerceMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // Find customer by email with password_hash for verification
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...EcommerceMallCustomerTransformer.select().select,
      password_hash: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password (comparison not case-sensitive per section 49)
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Generate session ID and timestamps using numeric epoch values
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpiresEpoch = Date.now() + 60 * 60 * 1000;
  const refreshExpiresEpoch = Date.now() + 7 * 24 * 60 * 60 * 1000;
  // Create session record with timestamp strings
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: customer.id,
      access_token: "",
      refresh_token: "",
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(accessExpiresEpoch),
      updated_at: new Date(accessExpiresEpoch),
      expired_at: new Date(accessExpiresEpoch),
    },
  });
  // Generate JWT tokens with string timestamps
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const accessExpiredAt = toISOStringSafe(
    new Date(accessExpiresEpoch),
  ) as string & tags.Format<"date-time">;
  const refreshableUntil = toISOStringSafe(
    new Date(refreshExpiresEpoch),
  ) as string & tags.Format<"date-time">;
  const tokenPayload = {
    type: "customer" as const,
    id: customer.id,
    session_id: sessionId,
    created_at: now,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh" as const,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  // Return authorized response
  return {
    ...(await EcommerceMallCustomerTransformer.transform(customer)),
    token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthCustomerLogin(props: {
//   ip: string;
//   body: IEcommerceMallCustomer.ILogin;
// }): Promise<IEcommerceMallCustomer.IAuthorized> {
//   return {
//     addresses: await ArrayUtil.asyncMap(..., (r) => EcommerceMallShippingAddressAtSummaryTransformer.transform(r)),
//     created_at: ...,
//     deleted_at: ...,
//     email: ...,
//     id: ...,
//     profile: await EcommerceMallCustomerProfileAtSummaryTransformer.transform(...),
//     updated_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------