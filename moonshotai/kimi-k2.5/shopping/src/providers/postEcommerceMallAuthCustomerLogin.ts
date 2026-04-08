import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Find customer by email with password_hash
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.create(
    {
      data: {
        id: sessionId,
        ecommerce_mall_customer_id: customer.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now.toISOString(),
        expired_at: accessExpires.toISOString(),
      },
    },
  );
  // 4. Get customer profile and default address
  const profile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findFirst({
      where: {
        ecommerce_mall_customer_id: customer.id,
      },
      select: {
        display_name: true,
        phone_number: true,
      },
    });
  const defaultAddress =
    await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
      where: {
        ecommerce_mall_customer_id: customer.id,
        is_default: true,
      },
      select: {
        recipient_name: true,
        street_address: true,
        city: true,
        state_or_province: true,
        postal_code: true,
        country: true,
        is_default: true,
      },
    });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer" as const,
        id: customer.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer" as const,
        id: customer.id,
        session_id: session.id,
        tokenType: "refresh" as const,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized response
  const createdAtISO = toISOStringSafe(customer.created_at);
  const updatedAtISO = toISOStringSafe(customer.updated_at);
  const customerSummary: IEcommerceMallCustomer.ISummary = {
    id: customer.id,
    email: customer.email,
    displayName: profile?.display_name ?? "",
    createdAt: createdAtISO,
    deletedAt: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  };
  return {
    id: customer.id,
    email: customer.email,
    displayName: profile?.display_name ?? "",
    recipientName: defaultAddress?.recipient_name ?? "",
    phoneNumber: profile?.phone_number ?? "",
    streetAddress: defaultAddress?.street_address ?? "",
    city: defaultAddress?.city ?? "",
    state: defaultAddress?.state_or_province ?? "",
    postalCode: defaultAddress?.postal_code ?? "",
    country: defaultAddress?.country ?? "",
    isDefault: defaultAddress?.is_default ?? false,
    createdAt: createdAtISO,
    updatedAt: updatedAtISO,
    customer: customerSummary,
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthCustomerLogin(props: {
//   ip: string;
//   body: IEcommerceMallCustomer.ILogin;
// }): Promise<IEcommerceMallCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------