import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";

export async function test_api_notification_queue_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Validate that the admin account was created and authenticated successfully
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin status is active", admin.status, "active");
  TestValidator.equals("admin role is full_admin", admin.role, "full_admin");

  // Step 3: Generate pagination request parameters for notification queue
  // We'll request exactly 10 notifications on page 1
  const request: IShoppingMallNotificationQueue.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallNotificationQueue.IRequest;

  // Step 4: Call the pagination endpoint to retrieve notifications
  const paginationResult: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: request,
      },
    );
  typia.assert(paginationResult);

  // Step 5: Validate pagination metadata (current, limit, records, pages)
  TestValidator.equals(
    "current page should be 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit per page should be 10",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be >= 0",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be >= 1",
    paginationResult.pagination.pages >= 1,
  );

  // Step 6: Validate data array exists and has correct length according to limit
  TestValidator.predicate(
    "data array should not be null or undefined",
    paginationResult.data != null,
  );
  TestValidator.predicate(
    "data array length should be <= limit",
    paginationResult.data.length <= 10,
  );

  // Step 7: Verify each notification summary item has required properties
  for (const notification of paginationResult.data) {
    TestValidator.equals(
      "notification id should be string",
      typeof notification.id,
      "string",
    );
    TestValidator.equals(
      "notification user_id should be string",
      typeof notification.user_id,
      "string",
    );
    TestValidator.equals(
      "notification template_id should be string",
      typeof notification.template_id,
      "string",
    );
    TestValidator.predicate(
      "notification status should be one of valid values",
      ["pending", "delivered", "failed"].includes(notification.status),
    );
    TestValidator.equals(
      "notification created_at should be ISO date-time format",
      typeof notification.created_at,
      "string",
    );

    // Verification of created_at format using regex
    TestValidator.predicate(
      "notification created_at should match ISO 8601 format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-][0-2][0-9]:[0-5][0-9])$/.test(
        notification.created_at,
      ),
    );

    // Skip updated_at validation if undefined as per schema
    if (notification.updated_at !== undefined) {
      TestValidator.equals(
        "notification updated_at should be ISO date-time format",
        typeof notification.updated_at,
        "string",
      );
      TestValidator.predicate(
        "notification updated_at should match ISO 8601 format",
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-][0-2][0-9]:[0-5][0-9])$/.test(
          notification.updated_at,
        ),
      );
    }
  }
}
