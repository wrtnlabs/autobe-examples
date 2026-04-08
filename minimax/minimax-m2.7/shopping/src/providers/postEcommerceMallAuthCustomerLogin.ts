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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IEcommerceMallCustomer.ILogin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
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
  if (customer.deleted_at !== null) {
    throw new HttpException("Your account has been suspended", 403);
  }
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = toISOStringSafe(new Date());
  const sessionId = v4();
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const accessToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: customer.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      updated_at: new Date(),
      expired_at: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const [
    profile,
    shippingAddresses,
    wishlists,
    cart,
    orders,
    reviews,
    cancellationRequests,
    refundRequests,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customer_profiles.findFirst({
      where: { ecommerce_mall_customer_id: customer.id },
      ...EcommerceMallCustomerProfileTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
      where: {
        ecommerce_mall_customer_id: customer.id,
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_wishlists.findFirst({
      where: { shopping_customer_id: customer.id },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        wishlistItems: {
          select: {
            id: true,
            created_at: true,
            product: {
              select: {
                id: true,
                name: true,
                base_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                category: { select: { id: true, name: true } },
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    rejected_at: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
        customer: {
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
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_carts.findFirst({
      where: { ecommerce_mall_customer_id: customer.id },
      ...EcommerceMallCartTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_orders.findMany({
      where: { ecommerce_mall_customer_id: customer.id },
      ...EcommerceMallOrderTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: { ecommerce_mall_customer_id: customer.id },
      ...EcommerceMallReviewTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: { ecommerce_mall_customer_id: customer.id },
      ...EcommerceMallCancellationRequestTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: { ecommerce_mall_customer_id: customer.id },
      ...EcommerceMallRefundRequestTransformer.select(),
    }),
  ]);
  const buildCustomerSummary = (
    c: {
      id: string;
      email: string;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    },
    p?: {
      id: string;
      display_name: string;
      phone: string;
      created_at: Date;
      updated_at: Date;
    } | null,
  ): IEcommerceMallCustomer.ISummary => ({
    id: c.id,
    email: c.email,
    created_at: toISOStringSafe(c.created_at),
    updated_at: toISOStringSafe(c.updated_at),
    deleted_at: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
    status: c.deleted_at ? "banned" : "active",
    profile: p
      ? {
          id: p.id,
          display_name: p.display_name,
          phone: p.phone,
          created_at: toISOStringSafe(p.created_at),
          updated_at: toISOStringSafe(p.updated_at),
        }
      : {
          id: c.id,
          display_name: "",
          phone: "",
          created_at: toISOStringSafe(c.created_at),
          updated_at: toISOStringSafe(c.updated_at),
        },
  });
  const buildProductSummary = (p: {
    id: string;
    name: string;
    base_price: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    category: {
      id: string;
      name: string;
    };
    seller: {
      id: string;
      email: string;
      approval_status: string;
      rejection_reason: string | null;
      rejected_at: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
  }): IEcommerceMallProduct.ISummary => ({
    id: p.id,
    name: p.name,
    basePrice: p.base_price,
    categoryName: p.category.name,
    hasStock: true,
    createdAt: toISOStringSafe(p.created_at),
    updatedAt: toISOStringSafe(p.updated_at),
    seller: p.seller
      ? ({
          id: p.seller.id,
          email: p.seller.email,
          approvalStatus: p.seller.approval_status,
          rejectionReason: p.seller.rejection_reason,
          rejectedAt: p.seller.rejected_at
            ? (toISOStringSafe(p.seller.rejected_at) as string &
                tags.Format<"date-time">)
            : null,
          shopName: null,
          suspensionStatus: "active",
          createdAt: toISOStringSafe(p.seller.created_at),
          updatedAt: toISOStringSafe(p.seller.updated_at),
          deletedAt: p.seller.deleted_at
            ? (toISOStringSafe(p.seller.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        } as IEcommerceMallSeller.ISummary)
      : undefined,
  });
  type WishlistWithRelations = {
    id: string;
    created_at: Date;
    updated_at: Date;
    wishlistItems: Array<{
      id: string;
      created_at: Date;
      product: {
        id: string;
        name: string;
        base_price: number;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        category: {
          id: string;
          name: string;
        };
        seller: {
          id: string;
          email: string;
          approval_status: string;
          rejection_reason: string | null;
          rejected_at: Date | null;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        } | null;
      };
    }>;
    customer: {
      id: string;
      email: string;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      profile: {
        id: string;
        display_name: string;
        phone: string;
        created_at: Date;
        updated_at: Date;
      } | null;
    };
  } | null;
  const wishlistData = wishlists as WishlistWithRelations;
  let wishlistItem: IEcommerceMallWishlistItem;
  if (
    wishlistData &&
    wishlistData.wishlistItems &&
    wishlistData.wishlistItems.length > 0
  ) {
    const firstItem = wishlistData.wishlistItems[0];
    wishlistItem = {
      id: firstItem.id,
      created_at: toISOStringSafe(firstItem.created_at),
      product: buildProductSummary(firstItem.product),
      wishlist: {
        id: wishlistData.id,
        createdAt: toISOStringSafe(wishlistData.created_at),
        updatedAt: toISOStringSafe(wishlistData.updated_at),
        customer: buildCustomerSummary(
          wishlistData.customer,
          wishlistData.customer.profile,
        ),
      },
    };
  } else if (wishlistData) {
    wishlistItem = {
      id: wishlistData.id,
      created_at: toISOStringSafe(wishlistData.created_at),
      product: {
        id: customer.id,
        name: "",
        basePrice: 0,
        categoryName: "",
        hasStock: false,
        createdAt: toISOStringSafe(wishlistData.created_at),
        updatedAt: toISOStringSafe(wishlistData.updated_at),
      },
      wishlist: {
        id: wishlistData.id,
        createdAt: toISOStringSafe(wishlistData.created_at),
        updatedAt: toISOStringSafe(wishlistData.updated_at),
        customer: buildCustomerSummary(
          wishlistData.customer,
          wishlistData.customer.profile,
        ),
      },
    };
  } else {
    wishlistItem = {
      id: v4(),
      created_at: now,
      product: {
        id: customer.id,
        name: "",
        basePrice: 0,
        categoryName: "",
        hasStock: false,
        createdAt: toISOStringSafe(customer.created_at),
        updatedAt: toISOStringSafe(customer.updated_at),
      },
      wishlist: {
        id: v4(),
        createdAt: toISOStringSafe(customer.created_at),
        updatedAt: toISOStringSafe(customer.updated_at),
        customer: buildCustomerSummary(customer, profile ?? undefined),
      },
    };
  }
  return {
    id: customer.id,
    email: customer.email,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    deletedAt: null,
    profile: profile
      ? await EcommerceMallCustomerProfileTransformer.transform(profile)
      : {
          id: customer.id,
          display_name: "",
          phone: "",
          created_at: toISOStringSafe(customer.created_at),
          updated_at: toISOStringSafe(customer.updated_at),
          customer: buildCustomerSummary(customer),
        },
    shippingAddresses: await ArrayUtil.asyncMap(
      shippingAddresses ?? [],
      EcommerceMallShippingAddressTransformer.transform,
    ),
    wishlist: wishlistItem,
    cart: cart
      ? await EcommerceMallCartTransformer.transform(cart)
      : {
          id: v4(),
          customer: buildCustomerSummary(customer, profile ?? undefined),
          items: [],
          total: 0,
          createdAt: toISOStringSafe(customer.created_at),
          updatedAt: toISOStringSafe(customer.updated_at),
        },
    orders: await ArrayUtil.asyncMap(
      orders ?? [],
      EcommerceMallOrderTransformer.transform,
    ),
    reviews: await ArrayUtil.asyncMap(
      reviews ?? [],
      EcommerceMallReviewTransformer.transform,
    ),
    cancellationRequests: await ArrayUtil.asyncMap(
      cancellationRequests ?? [],
      EcommerceMallCancellationRequestTransformer.transform,
    ),
    refundRequests: await ArrayUtil.asyncMap(
      refundRequests ?? [],
      EcommerceMallRefundRequestTransformer.transform,
    ),
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
// export async function postEcommerceMallAuthCustomerLogin(props: {
//   ip: string;
//   body: IEcommerceMallCustomer.ILogin;
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