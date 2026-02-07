import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAddressTransformer } from "./EcommerceAddressTransformer";
import { EcommerceCancellationRequestAtSummaryTransformer } from "./EcommerceCancellationRequestAtSummaryTransformer";
import { EcommerceCartAtSummaryTransformer } from "./EcommerceCartAtSummaryTransformer";
import { EcommerceCustomerSessionTransformer } from "./EcommerceCustomerSessionTransformer";
import { EcommerceDefaultAddressAtSummaryTransformer } from "./EcommerceDefaultAddressAtSummaryTransformer";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";
import { EcommerceProductReviewAtSummaryTransformer } from "./EcommerceProductReviewAtSummaryTransformer";
import { EcommerceWishlistItemTransformer } from "./EcommerceWishlistItemTransformer";

export namespace EcommerceCustomerTransformer {
  export type Payload = Prisma.ecommerce_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerce_orders: EcommerceOrderAtSummaryTransformer.select(),
        ecommerce_carts: EcommerceCartAtSummaryTransformer.select(),
        ecommerce_addresses: EcommerceAddressTransformer.select(),
        ecommerce_wishlist_items: EcommerceWishlistItemTransformer.select(),
        ecommerce_product_reviews:
          EcommerceProductReviewAtSummaryTransformer.select(),
        ecommerce_customer_sessions:
          EcommerceCustomerSessionTransformer.select(),
        ecommerce_cancellation_requests:
          EcommerceCancellationRequestAtSummaryTransformer.select(),
        ecommerce_customer_password_resets:
          EcommerceCustomerSessionTransformer.select(),
        ecommerce_customer_email_verifications:
          EcommerceCustomerSessionTransformer.select(),
        ecommerce_default_addresses:
          EcommerceDefaultAddressAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_customersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceCustomer> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? null,
      phone: input.phone ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      orders: await ArrayUtil.asyncMap(input.ecommerce_orders, (item) =>
        EcommerceOrderAtSummaryTransformer.transform(item),
      ),
      carts: await ArrayUtil.asyncMap(input.ecommerce_carts, (item) =>
        EcommerceCartAtSummaryTransformer.transform(item),
      ),
      addresses: await ArrayUtil.asyncMap(input.ecommerce_addresses, (item) =>
        EcommerceAddressTransformer.transform(item),
      ),
      defaultAddress:
        await EcommerceDefaultAddressAtSummaryTransformer.transform(
          input.ecommerce_default_addresses,
        ),
      wishlistItems: await ArrayUtil.asyncMap(
        input.ecommerce_wishlist_items,
        (item) => EcommerceWishlistItemTransformer.transform(item),
      ),
      reviews: await ArrayUtil.asyncMap(
        input.ecommerce_product_reviews,
        (item) => EcommerceProductReviewAtSummaryTransformer.transform(item),
      ),
      sessions: await ArrayUtil.asyncMap(
        input.ecommerce_customer_sessions,
        (item) => EcommerceCustomerSessionTransformer.transform(item),
      ),
      cancellationRequests: await ArrayUtil.asyncMap(
        input.ecommerce_cancellation_requests,
        (item) =>
          EcommerceCancellationRequestAtSummaryTransformer.transform(item),
      ),
      passwordResets: await ArrayUtil.asyncMap(
        input.ecommerce_customer_password_resets,
        (item) => EcommerceCustomerSessionTransformer.transform(item),
      ),
      emailVerifications: await ArrayUtil.asyncMap(
        input.ecommerce_customer_email_verifications,
        (item) => EcommerceCustomerSessionTransformer.transform(item),
      ),
    };
  }
}
