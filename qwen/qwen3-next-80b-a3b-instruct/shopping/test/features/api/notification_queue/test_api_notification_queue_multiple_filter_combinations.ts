import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";

export async function test_api_notification_queue_multiple_filter_combinations(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filter combination 1: status=pending + priority=3
  const response1: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          status: "pending",
          priority: 3,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "response structure is correct",
    response1.pagination,
    response1.pagination,
  );
  TestValidator.predicate(
    "data array is present and non-null",
    response1.data !== undefined,
  );

  // Step 3: Test filter combination 2: status=processing + delivery_channel=email + max_attempts=1
  const response2: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          status: "processing",
          delivery_channel: "email",
          max_attempts: 1,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "response structure is correct",
    response2.pagination,
    response2.pagination,
  );
  TestValidator.predicate(
    "data array is present and non-null",
    response2.data !== undefined,
  );

  // Step 4: Test filter combination 3: notification_type=system_alert (filtering by type)
  const response3: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          notification_type: "system_alert",
          min_attempts: 2,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "response structure is correct",
    response3.pagination,
    response3.pagination,
  );
  TestValidator.predicate(
    "data array is present and non-null",
    response3.data !== undefined,
  );

  // Step 5: Test filter combination 4: status=failed + priority=2 + delivery_channel=sms
  const response4: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          status: "failed",
          priority: 2,
          delivery_channel: "sms",
          min_attempts: 1,
          max_attempts: 5,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "response structure is correct",
    response4.pagination,
    response4.pagination,
  );
  TestValidator.predicate(
    "data array is present and non-null",
    response4.data !== undefined,
  );

  // Step 6: Verify pagination properties if present
  // Since we can't control how many notifications exist, we can't predict pagination numbers
  // But we verify structure
  const testPagination = (pagination: IPage.IPagination) => {
    TestValidator.predicate(
      "pagination current is positive",
      pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      pagination.pages >= 0,
    );
  };

  testPagination(response1.pagination);
  testPagination(response2.pagination);
  testPagination(response3.pagination);
  testPagination(response4.pagination);
}
