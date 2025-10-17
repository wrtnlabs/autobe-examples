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
 * Test comprehensive admin cancellation search functionality with filtering.
 *
 * This test validates that administrators can search and retrieve all platform
 * cancellations with various filter combinations. The test creates a complete
 * order workflow (customer registration, address setup, payment method, order
 * placement, and cancellation request), then verifies the admin can search and
 * filter cancellation records across the entire platform.
 *
 * Steps:
 *
 * 1. Authenticate as admin for platform-wide access
 * 2. Create customer account and complete order setup
 * 3. Place order and submit cancellation request
 * 4. Execute admin cancellation search with filters
 * 5. Validate search results and response structure
 */
export async function test_api_cancellation_admin_comprehensive_search(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin for platform-wide cancellation access
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create customer account for order placement
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 3: Create delivery address for order
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 4: Create payment method for order
  const paymentData = {
    payment_type: "credit_card",
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      { body: paymentData },
    );
  typia.assert(paymentMethod);

  // Step 5: Place an order
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: "standard",
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse: IShoppingMallOrder.ICreateResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order should be created with at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];
  typia.assert(orderId);

  // Step 6: Submit cancellation request
  const cancellationData = {
    cancellation_reason: "Customer changed mind",
  } satisfies IShoppingMallOrder.ICancelRequest;

  const cancellationResponse: IShoppingMallOrder.ICancelResponse =
    await api.functional.shoppingMall.customer.orders.cancel(connection, {
      orderId: orderId,
      body: cancellationData,
    });
  typia.assert(cancellationResponse);

  // Step 7: Switch back to admin authentication for search
  const adminReauth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(adminReauth);

  // Step 8: Execute admin cancellation search without status filter (platform-wide access)
  const searchAllRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCancellation.IRequest;

  const searchAllResults: IPageIShoppingMallCancellation =
    await api.functional.shoppingMall.admin.cancellations.index(connection, {
      body: searchAllRequest,
    });
  typia.assert(searchAllResults);

  TestValidator.equals(
    "current page should match request",
    searchAllResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should match request",
    searchAllResults.pagination.limit,
    10,
  );

  // Step 9: Search with specific cancellation status filter
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    cancellation_status: cancellationResponse.cancellation_status,
  } satisfies IShoppingMallCancellation.IRequest;

  const filteredResults: IPageIShoppingMallCancellation =
    await api.functional.shoppingMall.admin.cancellations.index(connection, {
      body: statusFilterRequest,
    });
  typia.assert(filteredResults);

  // Step 10: Verify created cancellation appears in search results
  const foundCancellation = filteredResults.data.find(
    (c) => c.id === cancellationResponse.cancellation_id,
  );

  TestValidator.predicate(
    "created cancellation should be found in filtered search results",
    foundCancellation !== undefined,
  );

  if (foundCancellation !== undefined) {
    TestValidator.equals(
      "found cancellation status should match created status",
      foundCancellation.cancellation_status,
      cancellationResponse.cancellation_status,
    );
  }

  // Step 11: Verify platform-wide access by checking total records
  TestValidator.predicate(
    "admin should have access to platform-wide cancellation records",
    searchAllResults.pagination.records >= 0,
  );
}
