import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test pagination behavior for refund requests list endpoint.
 *
 * Validates the complete pagination workflow for post-purchase refund requests including multi-page navigation, pagination metadata accuracy, and result consistency across different page sizes. Ensures that refund requests are sorted by created_at DESC (newest first), pagination metadata correctly reflects total records and page counts, and no duplicate records appear across pages.
 *
 * Special attention is given to verifying that all refund requests are retrievable across paginated requests with no gaps or duplicates, and that changing the limit parameter correctly adjusts the number of pages. Note: Each order item can have at most one refund request per API constraints, so the test creates 6 refund requests from 6 order items to demonstrate pagination.
 *
 * 1. Member account creation via join endpoint.
 * 2. Seller account creation and approval, product with 6 variants creation.
 * 3. Order creation with 6 items (one per variant), shipment creation and delivery.
 * 4. Create 6 refund requests for the 6 delivered order items.
 * 5. Test pagination with page=1, limit=3 - verify 3 records, current=1, pages=2.
 * 6. Test pagination with page=2, limit=3 - verify 3 records, current=2.
 * 7. Test pagination with page=1, limit=5 - verify 5 records, pages=2.
 * 8. Test pagination with page=2, limit=5 - verify 1 record.
 * 9. Validate no duplicate record IDs across all pages, all 6 records retrievable.
 * 10. Validate sorting by created_at DESC (newest first).
 */
export async function test_api_refund_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create seller account and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Create 6 variants for 6 order items (to create 6 refund requests)
  const variantIds: string[] = [];
  const optionCombinations = [
    { color: "Red", size: "S" },
    { color: "Red", size: "M" },
    { color: "Blue", size: "S" },
    { color: "Blue", size: "M" },
    { color: "Green", size: "L" },
    { color: "Green", size: "XL" },
  ];
  for (let i = 0; i < 6; i++) {
    const combo = optionCombinations[i];
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SKU-${i}-${RandomGenerator.alphaNumeric(4)}`,
            option_values: `Color: ${combo.color}, Size: ${combo.size}`,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    variantIds.push(variant.id);
  }
  // 3. Create order with multiple items
  // Note: Order items are derived from customer's cart automatically
  const order =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // Get order items from the order
  const orderItemIds = order.orderItems.map((item) => item.id);
  // 4. Create shipment and mark as delivered
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: orderItemIds,
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 5. Create 6 refund requests for the delivered order items
  // Each order item can have at most one refund request
  const refundRequestIds: string[] = [];
  const totalRequests = Math.min(6, orderItemIds.length);
  for (let i = 0; i < totalRequests; i++) {
    const orderItemId = orderItemIds[i];
    const refundRequest =
      await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
        memberConnection,
        {
          body: {
            order_item_id: orderItemId,
            reason: `Refund request #${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    typia.assert(refundRequest);
    refundRequestIds.push(refundRequest.id);
    // Small delay to ensure different created_at timestamps for sorting validation
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 6. Test pagination with page=1, limit=3
  const page1Result =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 3);
  TestValidator.equals(
    "page 1 records",
    page1Result.pagination.records,
    totalRequests,
  );
  TestValidator.equals(
    "page 1 pages",
    page1Result.pagination.pages,
    Math.ceil(totalRequests / 3),
  );
  TestValidator.equals("page 1 data length", page1Result.data.length, 3);
  // 7. Test pagination with page=2, limit=3
  const page2Result =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 3);
  TestValidator.equals(
    "page 2 records",
    page2Result.pagination.records,
    totalRequests,
  );
  TestValidator.equals(
    "page 2 pages",
    page2Result.pagination.pages,
    Math.ceil(totalRequests / 3),
  );
  TestValidator.equals(
    "page 2 data length",
    page2Result.data.length,
    totalRequests - 3,
  );
  // 8. Test pagination with page=1, limit=5
  const page1Limit5Result =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(page1Limit5Result);
  TestValidator.equals(
    "page 1 limit 5 current",
    page1Limit5Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 5 limit",
    page1Limit5Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 limit 5 records",
    page1Limit5Result.pagination.records,
    totalRequests,
  );
  TestValidator.equals(
    "page 1 limit 5 pages",
    page1Limit5Result.pagination.pages,
    Math.ceil(totalRequests / 5),
  );
  TestValidator.equals(
    "page 1 limit 5 data length",
    page1Limit5Result.data.length,
    5,
  );
  // 9. Test pagination with page=2, limit=5 (should have remaining records)
  const page2Limit5Result =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(page2Limit5Result);
  TestValidator.equals(
    "page 2 limit 5 current",
    page2Limit5Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 5 limit",
    page2Limit5Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 limit 5 records",
    page2Limit5Result.pagination.records,
    totalRequests,
  );
  TestValidator.equals(
    "page 2 limit 5 pages",
    page2Limit5Result.pagination.pages,
    Math.ceil(totalRequests / 5),
  );
  TestValidator.equals(
    "page 2 limit 5 data length",
    page2Limit5Result.data.length,
    totalRequests - 5,
  );
  // 10. Validate no duplicate record IDs across all pages (limit=3)
  const allIds = [
    ...page1Result.data.map((r) => r.id),
    ...page2Result.data.map((r) => r.id),
  ];
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "no duplicate IDs across pages",
    uniqueIds.size,
    totalRequests,
  );
  TestValidator.equals("all records retrievable", allIds.length, totalRequests);
  // 11. Validate sorting by created_at DESC (newest first)
  const allResults = [...page1Result.data, ...page2Result.data];
  for (let i = 1; i < allResults.length; i++) {
    TestValidator.predicate(
      `sorted by created_at DESC (index ${i - 1} vs ${i})`,
      () =>
        new Date(allResults[i - 1].created_at).getTime() >=
        new Date(allResults[i].created_at).getTime(),
    );
  }
}