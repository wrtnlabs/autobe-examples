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
 * Test seller order items pagination with page and limit controls.
 *
 * Validates that the seller order items listing endpoint correctly handles pagination parameters — page and limit — and returns accurate pagination metadata alongside the data array. The test creates 12 order items through customer purchases, then verifies correct pagination behavior across normal pages and an out-of-bounds page request.
 *
 * Special attention is given to verifying that requesting a page beyond available results returns an empty data array while preserving accurate pagination metadata reflecting the actual total record and page counts. Newest-first ordering is validated both within a single page and across page boundaries.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Customer registers and authenticates via authorize_customer_join.
 * 3. Seller creates a product using the generation utility.
 * 4. Seller creates a variant with initial stock of 200.
 * 5. Customer places 12 orders, each containing the seller's variant, creating 12 order items.
 * 6. Page 1 with limit 10: expects 10 items, pagination shows current=1, records=12, pages=2.
 * 7. Page 2 with limit 10: expects 2 items, pagination consistent with page 1 totals.
 * 8. Page 3 with limit 10: expects empty data, pagination still shows records=12, pages=2.
 * 9. Validates newest-first ordering within page 1.
 * 10. Validates newest-first ordering across page boundary (last of page 1 >= first of page 2).
 */
export async function test_api_seller_order_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create product under seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 4. Create variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 200,
        },
      },
    );
  // 5. Customer places 12 orders to create 12 order items under the seller
  const ORDER_COUNT = 12;
  for (let i = 0; i < ORDER_COUNT; i++) {
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [{ variant_id: variant.id, quantity: 1 }],
        },
      },
    );
  }
  // 6. Query page 1 with limit 10
  const page1 = await api.functional.shoppingMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page1 pagination records",
    page1.pagination.records,
    ORDER_COUNT,
  );
  TestValidator.equals("page1 pagination pages", page1.pagination.pages, 2);
  TestValidator.equals("page1 data length", page1.data.length, 10);
  // 7. Query page 2 with limit 10
  const page2 = await api.functional.shoppingMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 pagination current", page2.pagination.current, 2);
  TestValidator.equals("page2 pagination limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page2 pagination records",
    page2.pagination.records,
    ORDER_COUNT,
  );
  TestValidator.equals("page2 pagination pages", page2.pagination.pages, 2);
  TestValidator.equals("page2 data length", page2.data.length, 2);
  // 8. Query page 3 (beyond available results)
  const page3 = await api.functional.shoppingMall.seller.order_items.index(
    sellerConnection,
    {
      body: {
        page: 3,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page3 pagination current", page3.pagination.current, 3);
  TestValidator.equals("page3 pagination limit", page3.pagination.limit, 10);
  TestValidator.equals(
    "page3 pagination records",
    page3.pagination.records,
    ORDER_COUNT,
  );
  TestValidator.equals("page3 pagination pages", page3.pagination.pages, 2);
  TestValidator.equals("page3 data length", page3.data.length, 0);
  // 9. Validate newest-first ordering within page 1
  for (let i = 0; i < page1.data.length - 1; i++) {
    TestValidator.predicate(
      "page1 newest-first ordering",
      page1.data[i].created_at >= page1.data[i + 1].created_at,
    );
  }
  // 10. Validate newest-first ordering across page boundary
  TestValidator.predicate(
    "cross-page newest-first ordering",
    page1.data[page1.data.length - 1].created_at >= page2.data[0].created_at,
  );
}
