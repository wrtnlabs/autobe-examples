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
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "./EcommerceMallCancellationRequestAtSummaryTransformer";
import { EcommerceMallCartTransformer } from "./EcommerceMallCartTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallCustomerProfileTransformer } from "./EcommerceMallCustomerProfileTransformer";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "./EcommerceMallRefundRequestAtSummaryTransformer";
import { EcommerceMallReviewAtSummaryTransformer } from "./EcommerceMallReviewAtSummaryTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";
import { EcommerceMallWishlistItemTransformer } from "./EcommerceMallWishlistItemTransformer";

export namespace EcommerceMallCustomerTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: { id: true } },
        passwordResets: { select: { id: true } },
        emailVerifications: { select: { id: true } },
        adminRequest: { select: { id: true } },
        refundRequestSnapshots: { select: { id: true } },
        profile: EcommerceMallCustomerProfileTransformer.select(),
        shippingAddresses: {
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
            updated_at: true,
            deleted_at: true,
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
            orders: { select: { id: true } },
          },
          where: { deleted_at: null },
        },
        orders: {
          select: {
            id: true,
            order_number: true,
            status: true,
            total_amount: true,
            subtotal: true,
            shipping_cost: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
            shippingAddress: { select: { id: true } },
            orderItems: { select: { id: true } },
            shipments: { select: { id: true } },
          },
          where: { deleted_at: null },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
            product: EcommerceMallProductAtSummaryTransformer.select(),
            orderItem: { select: { id: true } },
            reviewSnapshots: { select: { id: true } },
          },
          where: { deleted_at: null },
        },
        cancellationRequests:
          EcommerceMallCancellationRequestAtSummaryTransformer.select(),
        refundRequests: EcommerceMallRefundRequestAtSummaryTransformer.select(),
        wishlist: {
          select: {
            id: true,
            created_at: true,
            wishlistItems: {
              select: {
                id: true,
                created_at: true,
                product: EcommerceMallProductAtSummaryTransformer.select(),
              },
            },
          },
        },
        cart: EcommerceMallCartTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      profile: await EcommerceMallCustomerProfileTransformer.transform(
        input.profile,
      ),
      shippingAddresses: await ArrayUtil.asyncMap(
        input.shippingAddresses,
        EcommerceMallShippingAddressAtSummaryTransformer.transform,
      ),
      orders: await ArrayUtil.asyncMap(
        input.orders,
        EcommerceMallOrderAtSummaryTransformer.transform,
      ),
      reviews: await ArrayUtil.asyncMap(
        input.reviews,
        EcommerceMallReviewAtSummaryTransformer.transform,
      ),
      cancellationRequests: await ArrayUtil.asyncMap(
        input.cancellationRequests,
        EcommerceMallCancellationRequestAtSummaryTransformer.transform,
      ),
      refundRequests: await ArrayUtil.asyncMap(
        input.refundRequests,
        EcommerceMallRefundRequestAtSummaryTransformer.transform,
      ),
      wishlist: input.wishlist
        ? await EcommerceMallWishlistItemTransformer.transform(input.wishlist)
        : {
            id: "00000000-0000-0000-0000-000000000000",
            created_at: new Date().toISOString(),
            product: {
              id: "00000000-0000-0000-0000-000000000000",
              name: "",
              min_price: 0,
              max_price: 0,
              primary_image_url: "",
              seller_name: "",
              average_rating: 0,
              reviews_count: 0,
              created_at: new Date().toISOString(),
            },
          },
      cart: input.cart
        ? await EcommerceMallCartTransformer.transform(input.cart)
        : {
            id: "00000000-0000-0000-0000-000000000000",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            customer: {
              id: input.id,
              email: input.email,
              created_at: input.created_at.toISOString(),
              display_name: null,
              status: input.deleted_at
                ? ("deleted" as const)
                : ("active" as const),
            },
            cart_items: [],
          },
    };
  }
}
