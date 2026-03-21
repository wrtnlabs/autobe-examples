import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
  // 1. Check for duplicate email
  const existingCustomer =
    await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const customerId = v4() as string & tags.Format<"uuid">;
  // 2. Create customer record with hashed password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create customer profile (empty display_name and phone initially)
  const profileId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_customer_profiles.create({
    data: {
      id: profileId,
      ecommerce_mall_customer_id: customerId,
      display_name: "",
      phone: "",
      created_at: now,
      updated_at: now,
    },
  });
  // 4. Create empty wishlist
  const wishlistId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_wishlists.create({
    data: {
      id: wishlistId,
      shopping_customer_id: customerId,
      created_at: now,
      updated_at: now,
    },
  });
  // 5. Create empty cart
  const cartId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.ecommerce_mall_carts.create({
    data: {
      id: cartId,
      ecommerce_mall_customer_id: customerId,
      created_at: now,
      updated_at: now,
    },
  });
  // 6. Generate email verification token
  const emailVerificationId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await MyGlobal.prisma.ecommerce_mall_customer_email_verifications.create({
    data: {
      id: emailVerificationId,
      ecommerce_mall_customer_id: customerId,
      token: verificationToken,
      expires_at: expiresAt,
      verified_at: null,
    },
  });
  // 7. Create session with JWT tokens
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customerId,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
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
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: customerId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
    },
  });
  // 8. Fetch profile for response
  const profile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    });
  // 9. Build customer ISummary for nested relations
  const customerSummary: IEcommerceMallCustomer.ISummary = {
    id: customer.id,
    email: customer.email,
    created_at: toISOStringSafe(customer.created_at),
    display_name: null,
    status: customer.deleted_at === null ? "active" : "deleted",
  };
  // 10. Build empty wishlist item response
  const wishlistItemResponse: IEcommerceMallWishlistItem = {
    id: wishlistId,
    created_at: toISOStringSafe(now),
    product: {
      id: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
      name: "",
      min_price: 0,
      max_price: 0,
      primary_image_url: "",
      seller_name: "",
      average_rating: 0,
      reviews_count: 0 as number & tags.Type<"int32">,
      created_at: toISOStringSafe(now),
    } satisfies IEcommerceMallProduct.ISummary,
  };
  // 11. Build cart response - provide complete cart with empty items for new customer
  const cartResponse: IEcommerceMallCart = {
    id: cartId,
    customer: customerSummary,
    cart_items: [],
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
  } satisfies IEcommerceMallCart;
  // 12. Build cart item response - empty cart has placeholder product variant
  const zeroUuid = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const cartItemResponse: IEcommerceMallCartItem = {
    id: cartId,
    product_variant: {
      id: zeroUuid,
      sku_code: "",
      price: null,
      quantity: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      optionValues: [],
      created_at: toISOStringSafe(now),
    } satisfies IEcommerceMallProductVariant.ISummary,
    cart: cartResponse,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    subtotal: 0,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
  } satisfies IEcommerceMallCartItem;
  // 13. Build profile response
  const customerProfile: IEcommerceMallCustomerProfile = {
    id: profile!.id,
    display_name: profile!.display_name as string & tags.MaxLength<100>,
    phone: profile!.phone as string & tags.MinLength<10> & tags.MaxLength<20>,
    customer: customerSummary,
    created_at: toISOStringSafe(profile!.created_at),
    updated_at: toISOStringSafe(profile!.updated_at),
  };
  // 14. Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 15. Return IAuthorized response
  return {
    id: customer.id,
    email: customer.email,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toISOStringSafe(customer.deleted_at),
    profile: customerProfile,
    shippingAddresses: [] satisfies IEcommerceMallShippingAddress.ISummary[],
    orders: [] satisfies IEcommerceMallOrder.ISummary[],
    reviews: [] satisfies IEcommerceMallReview.ISummary[],
    cancellationRequests:
      [] satisfies IEcommerceMallCancellationRequest.ISummary[],
    refundRequests: [] satisfies IEcommerceMallRefundRequest.ISummary[],
    wishlist: wishlistItemResponse,
    cart: cartItemResponse,
    token: token,
  } satisfies IEcommerceMallCustomer.IAuthorized;
}
