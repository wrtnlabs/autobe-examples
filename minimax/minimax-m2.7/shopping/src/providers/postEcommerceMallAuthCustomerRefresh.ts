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
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { EcommerceMallCartTransformer } from "../transformers/EcommerceMallCartTransformer";
import { EcommerceMallCustomerProfileTransformer } from "../transformers/EcommerceMallCustomerProfileTransformer";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { EcommerceMallWishlistItemTransformer } from "../transformers/EcommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerRefresh(props: {
  body: IEcommerceMallCustomer.IRefresh;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "customer") {
    throw new HttpException("Invalid token type for customer refresh", 403);
  }
  // 3. Validate session exists
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
  // 4. Validate customer not deleted
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: decoded.id },
  });
  if (!customer) {
    throw new HttpException("Customer account not found", 404);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Customer account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const tokenPayload = {
    type: "customer" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: nowIso,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresIso),
    },
  });
  // 7. Fetch full customer data
  const fullCustomer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          ...EcommerceMallCustomerProfileTransformer.select(),
        },
        shippingAddresses: {
          where: { deleted_at: null },
          ...EcommerceMallShippingAddressTransformer.select(),
          orderBy: { created_at: "desc" },
        },
        wishlist: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            wishlistItems: {
              ...EcommerceMallWishlistItemTransformer.select(),
            },
          },
        },
        cart: {
          ...EcommerceMallCartTransformer.select(),
        },
        orders: {
          where: { deleted_at: null },
          ...EcommerceMallOrderTransformer.select(),
          orderBy: { created_at: "desc" },
        },
        reviews: {
          where: { deleted_at: null },
          ...EcommerceMallReviewTransformer.select(),
          orderBy: { created_at: "desc" },
        },
        cancellationRequests: {
          ...EcommerceMallCancellationRequestTransformer.select(),
          orderBy: { created_at: "desc" },
        },
        refundRequests: {
          ...EcommerceMallRefundRequestTransformer.select(),
          orderBy: { created_at: "desc" },
        },
      },
    });
  // 8. Transform using transformers
  if (!fullCustomer.profile) {
    throw new HttpException("Customer profile not found", 404);
  }
  const transformedProfile =
    await EcommerceMallCustomerProfileTransformer.transform(
      fullCustomer.profile,
    );
  const transformedShippingAddresses = await ArrayUtil.asyncMap(
    fullCustomer.shippingAddresses,
    EcommerceMallShippingAddressTransformer.transform,
  );
  // Transform wishlist item - get first item or create empty
  if (!fullCustomer.wishlist) {
    throw new HttpException("Customer wishlist not found", 404);
  }
  const firstWishlistItem = fullCustomer.wishlist.wishlistItems[0];
  let transformedWishlistItem: IEcommerceMallWishlistItem;
  if (firstWishlistItem) {
    transformedWishlistItem =
      await EcommerceMallWishlistItemTransformer.transform(firstWishlistItem);
  } else {
    const wishlistCustomer = fullCustomer.wishlist.customer;
    const wishlistStatus = typia.assert<"active" | "banned">(
      wishlistCustomer.deleted_at === null ? "active" : "banned",
    );
    transformedWishlistItem = {
      id: fullCustomer.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(fullCustomer.wishlist.created_at) as string &
        tags.Format<"date-time">,
      product: {
        id: fullCustomer.id as string & tags.Format<"uuid">,
        name: "",
        basePrice: 0,
        categoryName: "",
        hasStock: false,
        createdAt: toISOStringSafe(fullCustomer.wishlist.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(fullCustomer.wishlist.updated_at) as string &
          tags.Format<"date-time">,
      },
      wishlist: {
        id: fullCustomer.wishlist.id as string & tags.Format<"uuid">,
        createdAt: toISOStringSafe(fullCustomer.wishlist.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(fullCustomer.wishlist.updated_at) as string &
          tags.Format<"date-time">,
        customer: {
          id: wishlistCustomer.id as string & tags.Format<"uuid">,
          email: wishlistCustomer.email,
          created_at: toISOStringSafe(wishlistCustomer.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(wishlistCustomer.updated_at) as string &
            tags.Format<"date-time">,
          deleted_at: wishlistCustomer.deleted_at
            ? (toISOStringSafe(wishlistCustomer.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
          status: wishlistStatus,
          profile: {
            id: wishlistCustomer.id as string & tags.Format<"uuid">,
            display_name: "",
            phone: "",
            created_at: toISOStringSafe(wishlistCustomer.created_at) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(wishlistCustomer.updated_at) as string &
              tags.Format<"date-time">,
          },
        },
      },
    };
  }
  // Transform cart
  let transformedCart: IEcommerceMallCart;
  if (fullCustomer.cart) {
    transformedCart = await EcommerceMallCartTransformer.transform(
      fullCustomer.cart,
    );
  } else {
    const customerStatus = typia.assert<"active" | "banned">(
      fullCustomer.deleted_at === null ? "active" : "banned",
    );
    transformedCart = {
      id: fullCustomer.id as string & tags.Format<"uuid">,
      customer: {
        id: fullCustomer.id as string & tags.Format<"uuid">,
        email: fullCustomer.email,
        created_at: toISOStringSafe(fullCustomer.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(fullCustomer.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: fullCustomer.deleted_at
          ? (toISOStringSafe(fullCustomer.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
        status: customerStatus,
        profile: {
          id: fullCustomer.id as string & tags.Format<"uuid">,
          display_name: "",
          phone: "",
          created_at: toISOStringSafe(fullCustomer.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(fullCustomer.updated_at) as string &
            tags.Format<"date-time">,
        },
      },
      items: [],
      total: 0,
      createdAt: toISOStringSafe(fullCustomer.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(fullCustomer.updated_at) as string &
        tags.Format<"date-time">,
    };
  }
  const transformedOrders = await ArrayUtil.asyncMap(
    fullCustomer.orders,
    EcommerceMallOrderTransformer.transform,
  );
  const transformedReviews = await ArrayUtil.asyncMap(
    fullCustomer.reviews,
    EcommerceMallReviewTransformer.transform,
  );
  const transformedCancellationRequests = await ArrayUtil.asyncMap(
    fullCustomer.cancellationRequests,
    EcommerceMallCancellationRequestTransformer.transform,
  );
  const transformedRefundRequests = await ArrayUtil.asyncMap(
    fullCustomer.refundRequests,
    EcommerceMallRefundRequestTransformer.transform,
  );
  // 9. Return IAuthorized response
  return {
    id: fullCustomer.id as string & tags.Format<"uuid">,
    email: fullCustomer.email,
    createdAt: toISOStringSafe(fullCustomer.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(fullCustomer.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: fullCustomer.deleted_at
      ? (toISOStringSafe(fullCustomer.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    profile: transformedProfile,
    shippingAddresses: transformedShippingAddresses,
    wishlist: transformedWishlistItem,
    cart: transformedCart,
    orders: transformedOrders,
    reviews: transformedReviews,
    cancellationRequests: transformedCancellationRequests,
    refundRequests: transformedRefundRequests,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresIso as string & tags.Format<"date-time">,
    } satisfies IAuthorizationToken,
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
// export async function postEcommerceMallAuthCustomerRefresh(props: {
//   body: IEcommerceMallCustomer.IRefresh;
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