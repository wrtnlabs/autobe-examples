import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller pagination of cancellation requests with filtering and sorting.
 *
 * Validates that sellers can efficiently browse through their cancellation requests using pagination controls. The test creates multiple cancellation requests exceeding the default page limit, then verifies correct page navigation, metadata accuracy, and sorting behavior (both ascending and descending by creation date).
 *
 * Special attention is given to ensuring pagination metadata (current page, total pages, total records) is accurate and that sorting by created_at works correctly in both directions with proper default behavior.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with a variant containing initial stock.
 * 3. Multiple customers (25 total) register and authenticate.
 * 4. Each customer adds the variant to cart, creates a shipping address, and checks out to create an order with paid items.
 * 5. Each customer creates a cancellation request for their order item.
 * 6. Seller paginates through cancellation requests with page=1, limit=10.
 * 7. Validates first page contains 10 requests with correct pagination metadata.
 * 8. Seller requests page=2 with limit=10.
 * 9. Validates second page contains different 10 requests with updated metadata.
 * 10. Seller requests page=3 with limit=10.
 * 11. Validates third page contains remaining 5 requests.
 * 12. Seller tests sorting with sort='-createdAt' (newest first).
 * 13. Validates requests are ordered by creation date descending.
 * 14. Seller tests sorting with sort='createdAt' (oldest first).
 * 15. Validates requests are ordered by creation date ascending.
 * 16. Seller tests default sorting (no sort parameter).
 * 17. Validates default behavior is newest first (-createdAt).
 */
export async function test_api_cancellation_request_seller_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates product with variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: 100 },
      },
    );
  typia.assert(variant);
  // 3-5. Create 25 customers, each places order and creates cancellation request
  const customerConnections: api.IConnection[] = [];
  const cancellationRequests: IShoppingMallCancellationRequest[] = [];
  for (let i = 0; i < 25; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: undefined,
    });
    typia.assert(customerAuth);
    customerConnections.push(customerConnection);
    // Add variant to cart
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: variant.id,
            quantity: 1,
          },
        },
      );
    typia.assert(cartItem);
    // Checkout to create order (prepare function will handle address creation)
    const order = await generate_random_shopping_mall_customer_checkout(
      customerConnection,
      { body: undefined },
    );
    typia.assert(order);
    // Create cancellation request for the order item
    const cancellationRequest =
      await generate_random_shopping_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: order.items[0].id,
            reason: `Customer ${i + 1} wants to cancel this order`,
          },
        },
      );
    typia.assert(cancellationRequest);
    cancellationRequests.push(cancellationRequest);
    // Small delay to ensure distinct created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 6. Test pagination page=1, limit=10
  const page1Response =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 contains 10 requests",
    page1Response.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit is 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 total records is 25",
    page1Response.pagination.records,
    25,
  );
  TestValidator.equals(
    "page 1 total pages is 3",
    page1Response.pagination.pages,
    3,
  );
  // 8. Test pagination page=2, limit=10
  const page2Response =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 contains 10 requests",
    page2Response.data.length,
    10,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 total records is 25",
    page2Response.pagination.records,
    25,
  );
  TestValidator.equals(
    "page 2 total pages is 3",
    page2Response.pagination.pages,
    3,
  );
  // Verify page 2 has different requests than page 1
  const page1Ids = page1Response.data.map((req) => req.id);
  const page2Ids = page2Response.data.map((req) => req.id);
  TestValidator.predicate(
    "page 2 has different requests than page 1",
    page2Ids.every((id) => !page1Ids.includes(id)),
  );
  // 10. Test pagination page=3, limit=10
  const page3Response =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 contains 5 requests",
    page3Response.data.length,
    5,
  );
  TestValidator.equals(
    "page 3 current page is 3",
    page3Response.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit is 10",
    page3Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 3 total records is 25",
    page3Response.pagination.records,
    25,
  );
  TestValidator.equals(
    "page 3 total pages is 3",
    page3Response.pagination.pages,
    3,
  );
  // 12. Test sorting with sort='-createdAt' (newest first)
  const newestFirstResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 25,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(newestFirstResponse);
  TestValidator.equals(
    "newest first contains all 25 requests",
    newestFirstResponse.data.length,
    25,
  );
  // Verify requests are sorted by created_at descending
  for (let i = 1; i < newestFirstResponse.data.length; i++) {
    TestValidator.predicate(
      `request ${i} is newer than request ${i + 1}`,
      new Date(newestFirstResponse.data[i - 1].created_at).getTime() >=
        new Date(newestFirstResponse.data[i].created_at).getTime(),
    );
  }
  // 14. Test sorting with sort='createdAt' (oldest first)
  const oldestFirstResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 25,
          sort: "createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(oldestFirstResponse);
  TestValidator.equals(
    "oldest first contains all 25 requests",
    oldestFirstResponse.data.length,
    25,
  );
  // Verify requests are sorted by created_at ascending
  for (let i = 1; i < oldestFirstResponse.data.length; i++) {
    TestValidator.predicate(
      `request ${i} is older than request ${i + 1}`,
      new Date(oldestFirstResponse.data[i - 1].created_at).getTime() <=
        new Date(oldestFirstResponse.data[i].created_at).getTime(),
    );
  }
  // 16. Test default sorting (no sort parameter)
  const defaultSortResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(defaultSortResponse);
  TestValidator.equals(
    "default sort contains all 25 requests",
    defaultSortResponse.data.length,
    25,
  );
  // Verify default sort is newest first (same as -createdAt)
  TestValidator.equals(
    "default sort matches newest first order",
    defaultSortResponse.data.map((req) => req.id),
    newestFirstResponse.data.map((req) => req.id),
  );
}
