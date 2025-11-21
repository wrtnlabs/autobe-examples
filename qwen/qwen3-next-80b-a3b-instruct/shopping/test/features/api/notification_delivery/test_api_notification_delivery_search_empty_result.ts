import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";

export async function test_api_notification_delivery_search_empty_result(
  connection: api.IConnection,
) {
  // Authentication: Create three admin accounts for system state isolation
  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin1);

  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password456",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin2);

  const admin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password789",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin3);

  // Search for notification deliveries in a date range that is guaranteed to have no records
  // Assuming a clean test environment, no deliveries exist. We search for an irrelevant range.
  // Note: No delivery creation endpoint exists in the provided API functions. We rely on clean state.
  const searchStartDate = new Date();
  searchStartDate.setDate(searchStartDate.getDate() - 6); // 6 days ago
  const searchEndDate = new Date();
  searchEndDate.setDate(searchEndDate.getDate() - 5); // 5 days ago

  const emptyResult: IPageIShoppingMallNotificationDelivery =
    await api.functional.shoppingMall.admin.notifications.deliveries.index(
      connection,
      {
        body: {
          start_date: searchStartDate.toISOString(),
          end_date: searchEndDate.toISOString(),
          status: "success",
          delivery_channel: "email",
          template_id: typia.random<string & tags.Format<"uuid">>(),
          queue_id: typia.random<string & tags.Format<"uuid">>(),
          error_code: "",
          page: 0,
          limit: 10,
        } satisfies IShoppingMallNotificationDelivery.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Validate that search returns empty result set with proper pagination
  TestValidator.equals(
    "page count should be 0",
    emptyResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "page limit should be 10",
    emptyResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    emptyResult.data.length,
    0,
  );
}
