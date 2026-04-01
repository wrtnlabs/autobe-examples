import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can filter cancellation requests by creation date range and search by reason text.
 *
 * **Setup Prerequisites:**
 * 1. Register and authenticate a seller account
 * 2. Seller creates a product with at least one variant
 * 3. Register and authenticate a customer account
 * 4. Customer creates multiple orders at different times
 * 5. Customer creates multiple cancellation requests with different reasons and timestamps
 *
 * **Test Execution:**
 * 1. Seller calls PATCH /shoppingMall/seller/cancellation-requests with created_at_from filter
 * 2. Verify only requests created on or after the specified date are returned
 * 3. Seller calls PATCH /shoppingMall/seller/cancellation-requests with created_at_to filter
 * 4. Verify only requests created on or before the specified date are returned
 * 5. Seller calls PATCH /shoppingMall/seller/cancellation-requests with both date range filters
 * 6. Verify only requests within the date range are returned
 * 7. Seller calls PATCH /shoppingMall/seller/cancellation-requests with search parameter containing partial reason text
 * 8. Verify only requests with matching reason text are returned (case-insensitive partial match)
 * 9. Seller calls PATCH /shoppingMall/seller/cancellation-requests with custom sort parameter
 * 10. Verify results are sorted according to specified column and direction
 *
 * **Business Logic Validation:**
 * - Date range filters use ISO 8601 date-time format
 * - Search performs case-insensitive partial matching on cancellation reason
 * - Custom sorting supports column name and direction (ASC/DESC)
 * - Multiple filters can be combined (status + date range + search)
 * - Pagination metadata correctly reflects filtered result counts
 * - Default page size is 20, maximum is 100
 */
export async function test_api_cancellation_request_seller_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  // 2. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates a variant for the product
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Setup: Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoinResult);
  const customerLoginResult = await authorize_customer_login(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: "CustomerPass123!",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoginResult);
  // 5. Customer creates first order
  const order1 = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  // 6. Customer creates first cancellation request with specific reason
  const orderItemId1 = order1.orderItems[0]?.id;
  if (!orderItemId1) {
    throw new Error("First order has no order items");
  }
  const cancellationRequest1 =
    await api.functional.shoppingMall.customer.order_items.cancellation_requests.create(
      customerConnection,
      {
        orderItemId: orderItemId1,
        body: {
          reason: "Changed my mind about this purchase",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest1);
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Customer creates second order
  const order2 = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  // 8. Customer creates second cancellation request with different reason
  const orderItemId2 = order2.orderItems[0]?.id;
  if (!orderItemId2) {
    throw new Error("Second order has no order items");
  }
  const cancellationRequest2 =
    await api.functional.shoppingMall.customer.order_items.cancellation_requests.create(
      customerConnection,
      {
        orderItemId: orderItemId2,
        body: {
          reason: "Found better price elsewhere",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest2);
  // 9. Test: Filter by created_at_from
  const fromDate = new Date(
    Math.min(
      new Date(cancellationRequest1.createdAt).getTime(),
      new Date(cancellationRequest2.createdAt).getTime(),
    ),
  ).toISOString();
  const resultFrom =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          created_at_from: fromDate,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(resultFrom);
  TestValidator.predicate(
    "from date filter returns requests",
    () => resultFrom.data.length > 0,
  );
  TestValidator.predicate("all requests are from specified date or later", () =>
    resultFrom.data.every(
      (req) =>
        new Date(req.created_at).getTime() >= new Date(fromDate).getTime(),
    ),
  );
  // 10. Test: Filter by created_at_to
  const toDate = new Date(
    Math.max(
      new Date(cancellationRequest1.createdAt).getTime(),
      new Date(cancellationRequest2.createdAt).getTime(),
    ),
  ).toISOString();
  const resultTo =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          created_at_to: toDate,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(resultTo);
  TestValidator.predicate(
    "to date filter returns requests",
    () => resultTo.data.length > 0,
  );
  TestValidator.predicate(
    "all requests are before specified date or same",
    () =>
      resultTo.data.every(
        (req) =>
          new Date(req.created_at).getTime() <= new Date(toDate).getTime(),
      ),
  );
  // 11. Test: Filter by date range (both from and to)
  const resultRange =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(resultRange);
  TestValidator.predicate(
    "date range filter returns requests",
    () => resultRange.data.length > 0,
  );
  TestValidator.predicate("all requests are within date range", () =>
    resultRange.data.every(
      (req) =>
        new Date(req.created_at).getTime() >= new Date(fromDate).getTime() &&
        new Date(req.created_at).getTime() <= new Date(toDate).getTime(),
    ),
  );
  // 12. Test: Search by reason text (partial match)
  const searchResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          search: "price",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching requests",
    () => searchResult.data.length > 0,
  );
  TestValidator.predicate("all requests contain search term in reason", () =>
    searchResult.data.every((req) =>
      req.reason.toLowerCase().includes("price"),
    ),
  );
  // 13. Test: Custom sorting by created_at ASC
  const sortedResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          sort: "created_at ASC",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate("sorted results are in ascending order", () => {
    for (let i = 1; i < sortedResult.data.length; i++) {
      if (
        new Date(sortedResult.data[i].created_at).getTime() <
        new Date(sortedResult.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 14. Test: Pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => resultFrom.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () =>
      resultFrom.pagination.limit >= 1 && resultFrom.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    () => resultFrom.pagination.records >= resultFrom.data.length,
  );
  TestValidator.predicate(
    "pagination pages count is correct",
    () =>
      resultFrom.pagination.pages ===
      Math.ceil(resultFrom.pagination.records / resultFrom.pagination.limit),
  );
  // 15. Test: Combined filters (status + date range + search)
  const combinedResult =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          created_at_from: fromDate,
          created_at_to: toDate,
          search: "mind",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate("combined filters return matching requests", () =>
    combinedResult.data.every(
      (req) =>
        req.status === "pending" &&
        new Date(req.created_at).getTime() >= new Date(fromDate).getTime() &&
        new Date(req.created_at).getTime() <= new Date(toDate).getTime() &&
        req.reason.toLowerCase().includes("mind"),
    ),
  );
}