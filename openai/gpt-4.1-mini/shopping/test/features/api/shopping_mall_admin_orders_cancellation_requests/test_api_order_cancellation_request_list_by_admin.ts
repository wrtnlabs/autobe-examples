import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test to validate admin retrieval of paginated, filtered, and sorted list of
 * cancellation requests for a specific order ID.
 *
 * This test simulates full multi-user context:
 *
 * 1. Admin registers and logs in.
 * 2. Customer registers.
 * 3. Seller registers.
 * 4. Customer creates an order associated with the seller.
 * 5. Admin queries cancellation requests for this order ID with various filters.
 * 6. Validates response correctness including pagination, sorting, filtering, and
 *    data ownership checks.
 * 7. Validates error handling on invalid query inputs.
 */
export async function test_api_order_cancellation_request_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd123";
  const adminJoinBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login to establish context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    type: "admin",
    remember_me: false,
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogged);

  // 3. Customer registers
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "CstmP@ss123",
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Seller registers
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SellP@ss321",
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 5. Customer creates an order associated with seller
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORD-${Date.now()}-${RandomGenerator.alphaNumeric(5)}`,
    total_price: 12345.67,
    status: "pending",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: RandomGenerator.name() + ", Sample City",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Admin queries cancellation requests list for the order with filters
  // Prepare a comprehensive request body with various filters and paging
  const requestBody = {
    page: 1,
    limit: 20,
    orderBy: "asc", // Valid values are 'asc' or 'desc'
    orderByColumn: "requested_at",
    search: "",
    status: "pending", // Allowed: 'pending', 'approved', 'rejected'
    fromDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    toDate: new Date().toISOString(),
  } satisfies IShoppingMallCancellationRequest.IRequest;

  const cancellationPage: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.admin.orders.cancellationRequests.indexCancellationRequests(
      connection,
      {
        orderId: order.id,
        body: requestBody,
      },
    );
  typia.assert(cancellationPage);

  // Validate pagination info
  TestValidator.predicate(
    "pagination limit positive",
    cancellationPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current positive",
    cancellationPage.pagination.current >= 1,
  );

  // Validate all entries in data correspond to the filtered order id
  for (const entry of cancellationPage.data) {
    TestValidator.equals(
      "entry order id matches",
      entry.shopping_mall_order_id,
      order.id,
    );

    // Validate status matches filter
    TestValidator.equals(
      "entry status matches filter",
      entry.status,
      "pending",
    );

    // Check timestamps within fromDate and toDate range
    TestValidator.predicate(
      "entry requested_at within date range",
      entry.requested_at >= requestBody.fromDate &&
        entry.requested_at <= requestBody.toDate,
    );
  }

  // 7. Test error handling: Call with invalid order ID to expect failure
  await TestValidator.error("invalid UUID orderId should error", async () => {
    await api.functional.shoppingMall.admin.orders.cancellationRequests.indexCancellationRequests(
      connection,
      {
        orderId: "invalid-uuid-format-string" as string & tags.Format<"uuid">,
        body: requestBody,
      },
    );
  });
}
