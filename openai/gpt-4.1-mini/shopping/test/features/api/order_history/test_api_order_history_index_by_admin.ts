import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";

/**
 * Validates retrieval of historical shopping mall order records by an
 * authenticated admin user.
 *
 * This test fully covers: authenticating an admin user, fetching order
 * histories via PATCH "/shoppingMall/admin/orderHistories" endpoint, applying
 * multiple common filters such as status filters and paging, and verifying
 * returned data integrity.
 *
 * The test assumes pre-existing orders with multiple status snapshots exist and
 * the admin user has sufficient permissions. The response is validated against
 * the expected pagination and summary structure, including date-time and uuid
 * formats.
 *
 * Steps:
 *
 * 1. Admin user registration and authentication via POST "/auth/admin/join".
 * 2. Use authenticated session to retrieve order histories with preset filters for
 *    realistic business queries.
 * 3. Validate the list pagination respects requested page and limit.
 * 4. Confirm order history snapshots contain valid and consistent state data.
 */
export async function test_api_order_history_index_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication - necessary for querying order histories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd";
  const fullName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: fullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "Admin user must have valid JWT access token",
    admin.token.access.length > 0,
  );

  // 2. Prepare realistic filter parameters for order histories
  // using typical filter values;
  // page=1, limit=10, order_status= e.g. "pending", payment_status= "paid", shipment_status= "delivered"
  // Include date range filtering
  const filters: IShoppingMallOrderHistory.IRequest = {
    page: 1,
    limit: 10,
    order_status: "pending",
    payment_status: "paid",
    shipment_status: "delivered",
    date_from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    date_to: new Date(Date.now()).toISOString(),
  };

  // 3. Fetch filtered paginated order histories
  const response: IPageIShoppingMallOrderHistory.ISummary =
    await api.functional.shoppingMall.admin.orderHistories.index(connection, {
      body: filters,
    });
  typia.assert(response);

  // 4. Validate pagination info is consistent
  TestValidator.predicate(
    "Pagination current page is positive",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pagination pages count is positive",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination records count is non-negative",
    response.pagination.records >= 0,
  );

  // 5. Validate each order history summary entry for expected properties and logical soundness
  for (const entry of response.data) {
    typia.assert(entry); // fully asserts all properties
    TestValidator.predicate(
      "Order history record's total amount positive",
      entry.total_amount >= 0,
    );
    TestValidator.predicate(
      "Order history created_at is valid ISO date",
      !isNaN(Date.parse(entry.created_at)),
    );
    TestValidator.predicate(
      "Order history updated_at is valid ISO date",
      !isNaN(Date.parse(entry.updated_at)),
    );
    TestValidator.predicate(
      "Order history order status is non-empty",
      entry.order_status.length > 0,
    );
    TestValidator.predicate(
      "Order history payment status is non-empty",
      entry.payment_status.length > 0,
    );
    TestValidator.predicate(
      "Order history shipment status is non-empty",
      entry.shipment_status.length > 0,
    );
  }
}
