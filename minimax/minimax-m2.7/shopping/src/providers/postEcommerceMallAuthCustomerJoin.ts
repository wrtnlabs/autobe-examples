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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerJoin(props: {
  ip: string;
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Check duplicate email (case-sensitive)
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Generate IDs and timestamps
  const customerId = v4();
  const profileId = v4();
  const wishlistId = v4();
  const cartId = v4();
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  // 4. Create customer
  await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 5. Create customer profile (empty display_name and phone)
  await MyGlobal.prisma.ecommerce_mall_customer_profiles.create({
    data: {
      id: profileId,
      ecommerce_mall_customer_id: customerId,
      display_name: "",
      phone: "",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 6. Create empty wishlist
  await MyGlobal.prisma.ecommerce_mall_wishlists.create({
    data: {
      id: wishlistId,
      shopping_customer_id: customerId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Create empty cart
  await MyGlobal.prisma.ecommerce_mall_carts.create({
    data: {
      id: cartId,
      ecommerce_mall_customer_id: customerId,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 8. Generate JWT tokens
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Create session
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: customerId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: new Date(accessExpires),
    },
  });
  // 10. Fetch customer for response
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            phone: true,
            created_at: true,
            updated_at: true,
          },
        },
        shippingAddresses: {
          where: { deleted_at: null },
          select: {
            id: true,
            recipient_name: true,
            phone: true,
            street_address: true,
            city: true,
            state: true,
            postal_code: true,
            country: true,
            is_default: true,
            created_at: true,
          },
        },
      },
    });
  // 11. Return IAuthorized response
  return {
    id: customer.id,
    email: customer.email,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    profile: {
      id: customer.profile!.id,
      displayName: customer.profile!.display_name,
      phone: customer.profile!.phone,
      createdAt: toISOStringSafe(customer.profile!.created_at),
      updatedAt: toISOStringSafe(customer.profile!.updated_at),
    },
    addresses: customer.shippingAddresses.map((addr) => ({
      id: addr.id,
      recipientName: addr.recipient_name,
      phone: addr.phone,
      streetAddress: addr.street_address,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postal_code,
      country: addr.country,
      isDefault: addr.is_default,
      createdAt: toISOStringSafe(addr.created_at),
    })),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthCustomerJoin(props: {
//   ip: string;
//   body: IEcommerceMallCustomer.IJoin;
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