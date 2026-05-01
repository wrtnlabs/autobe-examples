import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test seller order item filtering by 'paid' status for fulfillment workflow.
 *
 * Validates the seller's ability to filter order items by the 'paid' status to
 * identify items awaiting shipment. Ensures that when the status filter is set
 * to `['paid']`, only order items with 'paid' status are returned, while items
 * with other statuses do not appear in results.
 *
 * Also validates combined filtering: status filter with date range restricts
 * results to items within the date window matching the status, and status filter
 * with order_id narrows results to a specific order.
 *
 * 1. Seller registers, creates a product, a variant, and adds inventory stock.
 * 2. Customer registers and places an order containing the variant.
 * 3. Seller filters order items by 'paid' status — all returned items must be 'paid'.
 * 4. Seller combines status filter with date range — verifies combined filtering.
 * 5. Seller combines status filter with order_id — verifies order-scoped filtering.
 */
export async function test_api_seller_order_items_filter_by_paid_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Add inventory stock so variant becomes purchasable
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity_change: 100, reason: "Initial stock" },
    },
  );
  // 5. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Customer places order with the seller's variant
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 7. Filter order items by 'paid' status
  const paidResult = await api.functional.shoppingMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        status: ["paid"],
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(paidResult);
  // 8. Validate all returned items have 'paid' status
  TestValidator.predicate(
    "all returned items have paid status",
    paidResult.data.every((item) => item.status === "paid"),
  );
  TestValidator.predicate(
    "our order item is in results",
    paidResult.data.some((item) => item.order.id === order.id),
  );
  // 9. Test combined status + date range filtering
  const createdFrom = new Date(Date.now() - 60 * 1000).toISOString();
  const createdTo = new Date(Date.now() + 60 * 1000).toISOString();
  const dateRangeResult =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["paid"],
          created_from: createdFrom,
          created_to: createdTo,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filtered items have paid status",
    dateRangeResult.data.every((item) => item.status === "paid"),
  );
  // 10. Test combined status + order_id filtering
  const orderFilterResult =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: ["paid"],
          order_id: order.id,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderFilterResult);
  TestValidator.predicate(
    "order filter returns only items from our order",
    orderFilterResult.data.every((item) => item.order.id === order.id),
  );
  TestValidator.predicate(
    "order filter results have paid status",
    orderFilterResult.data.every((item) => item.status === "paid"),
  );
}
