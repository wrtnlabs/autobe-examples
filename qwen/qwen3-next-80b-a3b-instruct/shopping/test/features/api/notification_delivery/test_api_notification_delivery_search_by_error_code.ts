import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";

export async function test_api_notification_delivery_search_by_error_code(
  connection: api.IConnection,
) {
  // Create first admin account for test context
  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdmin.ICreate>(),
    });
  typia.assert(admin1);

  // Create second admin account to generate additional records
  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdmin.ICreate>(),
    });
  typia.assert(admin2);

  // Create third admin account to verify permissions context
  const admin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdmin.ICreate>(),
    });
  typia.assert(admin3);

  // Define target error code for filtering as specified in scenario
  const targetErrorCode = "INVALID_EMAIL";

  // Define search parameters that include ALL required fields as per IShoppingMallNotificationDelivery.IRequest schema
  // The scenario requires filtering by error_code, so we set it to INVALID_EMAIL
  // We use valid, random values for other required fields that have format constraints
  const searchParams: IShoppingMallNotificationDelivery.IRequest = {
    start_date: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours (required, ISO 8601)
    end_date: new Date().toISOString(), // Now (required, ISO 8601)
    status: "failed", // Required: one of "success", "failed", "skipped"
    delivery_channel: "email", // Required: one of "email", "in_app", "push"
    template_id: typia.random<string & tags.Format<"uuid">>(), // Required: UUID format
    queue_id: typia.random<string & tags.Format<"uuid">>(), // Required: UUID format
    error_code: targetErrorCode, // Required: system error code, set to target for filtering
    page: 0, // Required: 0-based index
    limit: 20, // Required: between 1 and 100
  } satisfies IShoppingMallNotificationDelivery.IRequest;

  // Perform the search with error_code filtering
  const result: IPageIShoppingMallNotificationDelivery =
    await api.functional.shoppingMall.admin.notifications.deliveries.index(
      connection,
      { body: searchParams },
    );
  typia.assert(result);

  // Validate that search returned results
  TestValidator.predicate("search returned results", result.data.length > 0);

  // Validate that all returned delivery records have the exact error_code we filtered by
  TestValidator.predicate(
    "all returned deliveries match the error_code filter",
    result.data.every((delivery) => delivery.error_code === targetErrorCode),
  );

  // Validate pagination information
  TestValidator.equals(
    "pagination current page",
    result.pagination.current,
    searchParams.page,
  );
  TestValidator.equals(
    "pagination limit",
    result.pagination.limit,
    searchParams.limit,
  );
  TestValidator.predicate(
    "pagination records count matches expected",
    result.pagination.records >= result.data.length,
  );

  // Validate that at least some of the delivery records have the target error code
  TestValidator.predicate(
    "at least one record has the target error code",
    result.data.some((delivery) => delivery.error_code === targetErrorCode),
  );
}
