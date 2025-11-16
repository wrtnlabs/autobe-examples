import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the ability of an authenticated customer to search and retrieve
 * paginated order items for their own specific shopping mall order.
 *
 * This comprehensive test covers multiple stages:
 *
 * 1. Customer account registration and login with access token retrieval.
 * 2. Seller account registration and login with access token retrieval.
 * 3. Creation of a shopping mall product by the authenticated seller.
 * 4. Shopping mall order creation by the authenticated customer.
 * 5. Execution of the order items search API for the created order by the
 *    customer, supplying various pagination and filtering parameters.
 * 6. Validation of pagination accuracy, search filtering consistency, and
 *    authorization boundaries, ensuring customers cannot see other customers'
 *    orders.
 *
 * This test verifies critical business logic and security constraints in
 * multi-actor e-commerce workflows.
 */
export async function test_api_shopping_mall_order_item_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and obtain authorized token
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  // 2. Seller registration and obtain authorized token
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "password1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuthorized);

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: null,
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 4. Customer creates a shopping mall order
  const orderCreateBody = {
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    payment_status: "pending",
    total_amount: 1000,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(order);

  // 5. Customer searches for order items with pagination and filters
  // Prepare search request body
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    status: null,
    min_quantity: null,
    max_quantity: null,
    created_after: null,
    created_before: null,
  } satisfies IShoppingMallOrderItem.IRequest;

  // Execute order items search
  const orderItemsResponse: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.index(
      connection,
      {
        orderId: order.id,
        body: requestBody,
      },
    );
  typia.assert(orderItemsResponse);

  // Validations
  TestValidator.predicate(
    "Pagination current page matches request",
    orderItemsResponse.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "Item count does not exceed limit",
    orderItemsResponse.data.length <= requestBody.limit,
  );

  // Authorization validation: Customer cannot access another customer's order
  // Attempt fetching order items with a fake order ID
  await TestValidator.error(
    "Unauthorized access to another customer's order should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: requestBody,
        },
      );
    },
  );

  // Additional test: Searching with search field containing part of product code
  const partialSearch = {
    ...requestBody,
    search: product.code.substring(0, 4),
  } satisfies IShoppingMallOrderItem.IRequest;

  const searchResult =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.index(
      connection,
      {
        orderId: order.id,
        body: partialSearch,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "Search results contains only order items matching search",
    searchResult.data.every((item) =>
      item.product.code.includes(partialSearch.search!),
    ),
  );

  // Additional test: Pagination navigation check - request page 2
  const pageTwoRequest = {
    ...requestBody,
    page: 2,
  } satisfies IShoppingMallOrderItem.IRequest;

  const pageTwoResult =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.index(
      connection,
      {
        orderId: order.id,
        body: pageTwoRequest,
      },
    );
  typia.assert(pageTwoResult);

  TestValidator.equals(
    "Pagination page number reflects in response",
    pageTwoResult.pagination.current,
    2,
  );
}
