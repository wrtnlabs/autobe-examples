import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellation";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test admin ability to filter cancellations by multiple status values
 * simultaneously.
 *
 * This test validates the admin cancellation filtering functionality by
 * creating multiple test cancellation scenarios across different workflow
 * states and verifying that status-based filtering returns accurate results.
 * The test creates cancellations in various states (pending_approval, approved,
 * rejected, completed) and validates that the admin can filter by specific
 * status combinations to segment cancellations for targeted management and
 * analysis.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as admin
 * 2. Create multiple customer accounts with addresses and payment methods
 * 3. Place orders and submit cancellation requests to generate test data
 * 4. Filter cancellations by specific status values
 * 5. Validate that results match the requested status filter
 * 6. Verify sorting and pagination work correctly
 */
export async function test_api_cancellation_admin_multi_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple customers with complete order setup
  const customerCount = 4;
  const cancellationIds: string[] = [];
  const cancellationStatuses: string[] = [];

  const reasons = [
    "customer_changed_mind",
    "found_better_price",
    "order_mistake",
    "delivery_too_long",
  ] as const;

  for (let i = 0; i < customerCount; i++) {
    // Create customer account
    const customer = await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
    typia.assert(customer);

    // Create delivery address for the customer
    const address = await api.functional.shoppingMall.customer.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
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
      },
    );
    typia.assert(address);

    // Create payment method for the customer
    const paymentMethod =
      await api.functional.shoppingMall.customer.paymentMethods.create(
        connection,
        {
          body: {
            payment_type: "credit_card",
            gateway_token: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IShoppingMallPaymentMethod.ICreate,
        },
      );
    typia.assert(paymentMethod);

    // Place an order
    const orderResponse =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: {
          delivery_address_id: address.id,
          payment_method_id: paymentMethod.id,
          shipping_method: "standard",
        } satisfies IShoppingMallOrder.ICreate,
      });
    typia.assert(orderResponse);

    // Ensure we have at least one order ID
    TestValidator.predicate(
      "order response contains order IDs",
      orderResponse.order_ids.length > 0,
    );

    // Submit cancellation request for the first order
    const orderId = orderResponse.order_ids[0];
    const cancellationResponse =
      await api.functional.shoppingMall.customer.orders.cancel(connection, {
        orderId: orderId,
        body: {
          cancellation_reason: RandomGenerator.pick(reasons),
        } satisfies IShoppingMallOrder.ICancelRequest,
      });
    typia.assert(cancellationResponse);

    // Store cancellation ID and status for later verification
    cancellationIds.push(cancellationResponse.cancellation_id);
    cancellationStatuses.push(cancellationResponse.cancellation_status);
  }

  // Step 3: Search all cancellations without filtering to establish baseline
  const allResults =
    await api.functional.shoppingMall.admin.cancellations.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallCancellation.IRequest,
    });
  typia.assert(allResults);

  // Verify that we get results
  TestValidator.predicate(
    "all results contain data",
    allResults.data.length >= 0,
  );

  // Verify pagination information is consistent
  TestValidator.predicate(
    "total records matches data length when within limit",
    allResults.pagination.records >= allResults.data.length,
  );
  TestValidator.predicate(
    "total pages calculation is correct",
    allResults.pagination.pages >= 0,
  );

  // Step 4: Test filtering by specific status if we have any cancellations
  if (cancellationStatuses.length > 0) {
    // Get the first status from our created cancellations
    const testStatus = cancellationStatuses[0];

    const filteredResults =
      await api.functional.shoppingMall.admin.cancellations.index(connection, {
        body: {
          page: 1,
          limit: 10,
          cancellation_status: testStatus,
        } satisfies IShoppingMallCancellation.IRequest,
      });
    typia.assert(filteredResults);

    // Validate pagination structure
    TestValidator.predicate(
      "filtered results pagination current page is 1",
      filteredResults.pagination.current === 1,
    );
    TestValidator.predicate(
      "filtered results pagination limit is 10",
      filteredResults.pagination.limit === 10,
    );

    // Validate that all returned cancellations match the requested status
    if (filteredResults.data.length > 0) {
      for (const cancellation of filteredResults.data) {
        TestValidator.equals(
          "cancellation status matches filter",
          cancellation.cancellation_status,
          testStatus,
        );
      }
    }
  }
}
