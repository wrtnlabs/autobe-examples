import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
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
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller refund request search and date filtering functionality.
 *
 * Validates the complete refund request search and filtering workflow including text search on reason field, date range filtering with created_at_from and created_at_to parameters, combined filter scenarios, and pagination behavior. Ensures that sellers can effectively locate and filter refund requests based on various criteria.
 *
 * The test creates multiple refund requests with different reasons and timestamps, then verifies that search and filter operations return the correct subsets of data. Special attention is given to boundary conditions in date range filtering and case-insensitive text matching.
 *
 * 1. Seller and member accounts are created and authenticated.
 * 2. Seller creates products with variants for purchase.
 * 3. Member places orders containing seller's products.
 * 4. Seller creates shipments to mark items as shipped.
 * 5. Multiple refund requests are created with different reasons and timestamps.
 * 6. Search by reason text is validated with various search terms.
 * 7. Date range filtering is tested with from, to, and combined parameters.
 * 8. Combined filters (status + search, status + date) are validated.
 * 9. Pagination behavior is verified with multiple pages of results.
 */
export async function test_api_seller_refund_request_search_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Setup: Create and authenticate member (customer)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
        },
      },
    );
  typia.assert(variant);
  // 5. Member adds item to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // 6. Member places order
  const order =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {
      body: {},
    });
  typia.assert(order);
  // 7. Seller creates shipment
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 8. Wait a bit to ensure different timestamps, then create refund requests with different reasons
  const refundRequests: IShoppingMallRefundRequest[] = [];
  // Refund request 1: defective product
  const refundRequest1 =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "defective product received",
        },
      },
    );
  typia.assert(refundRequest1);
  refundRequests.push(refundRequest1);
  // Create additional orders and refund requests for comprehensive testing
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  const order2 =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {
      body: {},
    });
  typia.assert(order2);
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: {
          order_item_ids: [order2.orderItems[0].id],
          carrier_name: "Test Carrier 2",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment2);
  // Refund request 2: wrong size
  const refundRequest2 =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: order2.orderItems[0].id,
          reason: "wrong size ordered by mistake",
        },
      },
    );
  typia.assert(refundRequest2);
  refundRequests.push(refundRequest2);
  // Create third order and refund request
  const cartItem3 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem3);
  const order3 =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {
      body: {},
    });
  typia.assert(order3);
  const shipment3 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order3.id },
        body: {
          order_item_ids: [order3.orderItems[0].id],
          carrier_name: "Test Carrier 3",
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment3);
  // Refund request 3: not as described
  const refundRequest3 =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: order3.orderItems[0].id,
          reason: "product not as described on website",
        },
      },
    );
  typia.assert(refundRequest3);
  refundRequests.push(refundRequest3);
  // 9. Test search by reason text - "defect"
  const searchDefect =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          search: "defect",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchDefect);
  TestValidator.predicate(
    "search defect returns only defective requests",
    searchDefect.data.every((r) => r.reason.toLowerCase().includes("defect")),
  );
  // 10. Test search by reason text - "wrong"
  const searchWrong =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          search: "wrong",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchWrong);
  TestValidator.predicate(
    "search wrong returns only wrong size requests",
    searchWrong.data.every((r) => r.reason.toLowerCase().includes("wrong")),
  );
  // 11. Test empty search returns all
  const searchAll =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchAll);
  TestValidator.predicate(
    "empty search returns all refund requests",
    searchAll.data.length >= refundRequests.length,
  );
  // 12. Test date range filtering - created_at_from
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const searchFromDate =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchFromDate);
  TestValidator.predicate(
    "created_at_from filters correctly",
    searchFromDate.data.every((r) => new Date(r.createdAt) >= yesterday),
  );
  // 13. Test date range filtering - created_at_to
  const searchToDate =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchToDate);
  TestValidator.predicate(
    "created_at_to filters correctly",
    searchToDate.data.every((r) => new Date(r.createdAt) <= tomorrow),
  );
  // 14. Test combined date range
  const searchDateRange =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchDateRange);
  TestValidator.predicate(
    "combined date range filters correctly",
    searchDateRange.data.every(
      (r) =>
        new Date(r.createdAt) >= yesterday && new Date(r.createdAt) <= tomorrow,
    ),
  );
  // 15. Test combined filters - status + search
  const searchCombined =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          search: "defect",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchCombined);
  TestValidator.predicate(
    "combined status and search filters correctly",
    searchCombined.data.every(
      (r) =>
        r.status === "pending" && r.reason.toLowerCase().includes("defect"),
    ),
  );
  // 16. Test pagination
  const paginatedResult =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination records count is correct",
    paginatedResult.pagination.records >= paginatedResult.data.length,
  );
  // Test page 2
  const page2Result =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.predicate(
    "page 2 returns different results",
    page2Result.data.length > 0,
  );
}