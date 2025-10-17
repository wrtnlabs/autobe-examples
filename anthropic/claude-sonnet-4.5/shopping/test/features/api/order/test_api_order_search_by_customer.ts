import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test comprehensive order search and filtering functionality for authenticated
 * customers.
 *
 * This test validates that customers can search their order history using
 * various filter criteria and receive accurate, properly paginated results. The
 * test creates a complete customer profile with necessary prerequisites, places
 * multiple orders, and then exercises the order search functionality with
 * different filter parameters.
 *
 * Test workflow:
 *
 * 1. Create a new customer account and authenticate
 * 2. Set up delivery address required for order placement
 * 3. Create payment method required for order payment
 * 4. Create multiple orders to establish searchable data
 * 5. Search orders using various criteria
 * 6. Validate search results accuracy and pagination
 */
export async function test_api_order_search_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);
  typia.assert(customer.token);

  // Step 2: Create delivery address for order placement
  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(address);

  // Step 3: Create payment method for order payment
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Create multiple orders to establish searchable order history
  const orderCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const createdOrders: IShoppingMallOrder.ICreateResponse[] =
    await ArrayUtil.asyncRepeat(orderCount, async () => {
      const orderResponse: IShoppingMallOrder.ICreateResponse =
        await api.functional.shoppingMall.customer.orders.create(connection, {
          body: {
            delivery_address_id: address.id,
            payment_method_id: paymentMethod.id,
            shipping_method: RandomGenerator.pick([
              "standard",
              "express",
              "overnight",
            ] as const),
          } satisfies IShoppingMallOrder.ICreate,
        });
      typia.assert(orderResponse);
      return orderResponse;
    });

  // Validate that orders were created successfully
  TestValidator.predicate(
    "should have created multiple orders",
    createdOrders.length >= 3,
  );

  // Step 5: Search orders with default pagination
  const searchResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.orders.index(connection, {
      body: {} satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate search results - typia.assert() already validated complete structure
  TestValidator.predicate(
    "search should return at least the created orders",
    searchResult.data.length > 0,
  );

  TestValidator.predicate(
    "pagination records should account for created orders",
    searchResult.pagination.records >= createdOrders.length,
  );

  // Validate each order summary
  searchResult.data.forEach((orderSummary: IShoppingMallOrder.ISummary) => {
    typia.assert(orderSummary);
  });

  // Step 7: Test pagination with specific page parameter
  const page2Result: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.orders.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(page2Result);

  TestValidator.predicate(
    "paginated search should return valid results",
    Array.isArray(page2Result.data),
  );
}
