import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test filtering order items by status on seller dashboard.
 * 1. Seller joins and creates product with inventory
 * 2. Customer joins, adds item to cart, and checks out
 * 3. Verify dashboard returns only 'paid' items when filtering by 'paid'
 * 4. Verify filtering by 'shipped' returns empty when no shipped items exist
 * 5. Validate pagination metadata in response
 */
export async function test_api_seller_dashboard_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  TestValidator.predicate("variant exists", !!variant);
  // 2. Add inventory to the variant
  const inventory =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          operation: "restock",
          quantity: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // 3. Customer joins, adds item to cart, and checks out
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // Customer checks out (creates order with 'paid' status items)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        },
      },
    );
  typia.assert(order);
  // 4. Verify dashboard returns only 'paid' items when filtering by 'paid'
  const paidItemsResponse =
    await api.functional.ecommerceMall.seller.dashboard.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["paid"] as (
            | "paid"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded"
          )[],
        },
      },
    );
  typia.assert(paidItemsResponse);
  // Validate all returned items have 'paid' status
  TestValidator.predicate("has paid items", paidItemsResponse.data.length > 0);
  for (const item of paidItemsResponse.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // Validate pagination metadata
  TestValidator.predicate("pagination exists", !!paidItemsResponse.pagination);
  TestValidator.predicate(
    "pagination current is valid",
    paidItemsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    paidItemsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    paidItemsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    paidItemsResponse.pagination.pages >= 1,
  );
  // 5. Verify filtering by 'shipped' returns empty when no shipped items exist
  const shippedItemsResponse =
    await api.functional.ecommerceMall.seller.dashboard.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["shipped"] as (
            | "paid"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded"
          )[],
        },
      },
    );
  typia.assert(shippedItemsResponse);
  // Validate no shipped items exist yet
  TestValidator.equals("no shipped items", shippedItemsResponse.data.length, 0);
  TestValidator.equals(
    "records is 0",
    shippedItemsResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages is 0", shippedItemsResponse.pagination.pages, 0);
}
