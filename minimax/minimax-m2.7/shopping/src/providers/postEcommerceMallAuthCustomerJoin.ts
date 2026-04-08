import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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

export async function postEcommerceMallAuthCustomerJoin(props: {
  ip: string;
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Check email uniqueness
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Generate UUIDs
  const customerId = v4();
  const profileId = v4();
  const wishlistId = v4();
  const cartId = v4();
  const verificationId = v4();
  const sessionId = v4();
  const verificationToken = v4();
  // 3. Generate timestamps
  const nowISO = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // 4. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 5. Create customer with profile, wishlist, cart
  await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      profile: {
        create: {
          id: profileId,
          display_name: props.body.name,
          phone: "",
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      wishlist: {
        create: {
          id: wishlistId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      cart: {
        create: {
          id: cartId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    },
  });
  // 6. Create email verification token
  await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.create({
    data: {
      id: verificationId,
      ecommerce_mall_customer_id: customerId,
      token: verificationToken,
      expires_at: verificationExpires,
      verified_at: null,
    },
  });
  // 7. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      created_at: nowISO,
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
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Create session
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
      expired_at: accessExpires,
    },
  });
  // 9. Fetch customer with transformer
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: customerId },
      ...EcommerceMallCustomerTransformer.select(),
    });
  // 10. Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: typia.assert<string & tags.Format<"date-time">>(
      accessExpires.toISOString(),
    ),
    refreshable_until: typia.assert<string & tags.Format<"date-time">>(
      refreshExpires.toISOString(),
    ),
  };
  // 11. Transform and return IAuthorized
  const transformed =
    await EcommerceMallCustomerTransformer.transform(customer);
  return {
    ...transformed,
    token,
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
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
// import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthCustomerJoin(props: {
//   ip: string;
//   body: IEcommerceMallCustomer.IJoin;
// }): Promise<IEcommerceMallCustomer.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     profile: await EcommerceMallCustomerProfileTransformer.transform(...),
//     shippingAddresses: await ArrayUtil.asyncMap(..., (r) => EcommerceMallShippingAddressTransformer.transform(r)),
//     wishlist: await EcommerceMallWishlistItemTransformer.transform(...),
//     cart: await EcommerceMallCartTransformer.transform(...),
//     orders: await ArrayUtil.asyncMap(..., (r) => EcommerceMallOrderTransformer.transform(r)),
//     reviews: await ArrayUtil.asyncMap(..., (r) => EcommerceMallReviewTransformer.transform(r)),
//     cancellationRequests: await ArrayUtil.asyncMap(..., (r) => EcommerceMallCancellationRequestTransformer.transform(r)),
//     refundRequests: await ArrayUtil.asyncMap(..., (r) => EcommerceMallRefundRequestTransformer.transform(r)),
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------