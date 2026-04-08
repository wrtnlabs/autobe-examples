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
import { EcommerceMallCustomerProfileAtSummaryTransformer } from "../transformers/EcommerceMallCustomerProfileAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "../transformers/EcommerceMallShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerRefresh(props: {
  body: IEcommerceMallCustomer.IRefresh;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Verify refresh token
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
  };
  // 2. Validate token type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not expired
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_customer_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Check session expiration
  if (session.expired_at < new Date()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate customer exists and not deleted
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: decoded.id },
    select: { id: true, deleted_at: true },
  });
  if (!customer) {
    throw new HttpException("Customer account not found", 401);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 5. Generate new JWT tokens with SAME session_id
  const accessExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const createdAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens and extended expiration
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: new Date(refreshExpiresAt),
      updated_at: new Date(),
    },
  });
  // 7. Fetch customer data with profile and addresses
  const customerWithRelations =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: EcommerceMallCustomerProfileAtSummaryTransformer.select(),
        shippingAddresses: {
          where: { deleted_at: null },
          ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
        },
      },
    });
  // 8. Handle null profile
  if (customerWithRelations.profile === null) {
    throw new HttpException("Customer profile not found", 401);
  }
  // 9. Return authorized response
  return {
    id: customerWithRelations.id as string & tags.Format<"uuid">,
    email: customerWithRelations.email,
    created_at: toISOStringSafe(customerWithRelations.created_at),
    updated_at: toISOStringSafe(customerWithRelations.updated_at),
    deleted_at: null,
    addresses: await ArrayUtil.asyncMap(
      customerWithRelations.shippingAddresses,
      EcommerceMallShippingAddressAtSummaryTransformer.transform,
    ),
    profile: await EcommerceMallCustomerProfileAtSummaryTransformer.transform(
      customerWithRelations.profile,
    ),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
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
// export async function postEcommerceMallAuthCustomerRefresh(props: {
//   body: IEcommerceMallCustomer.IRefresh;
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