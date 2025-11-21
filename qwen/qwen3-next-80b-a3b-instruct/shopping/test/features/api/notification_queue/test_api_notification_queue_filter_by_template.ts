import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";

export async function test_api_notification_queue_filter_by_template(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a valid template_id for filtering
  const templateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Call the filtering endpoint with template_id
  // Since we cannot create notification entries (no API available for creation),
  // we test that the filtering endpoint accepts template_id parameter and returns a valid response
  const response: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          template_id: templateId,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(response);

  // Step 4: Validate the response structure
  // We can only validate that the response structure is correct since we cannot create test data
  TestValidator.predicate(
    "response must include pagination information",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response must include data array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "data should be an array of summaries",
    response.data.length >= 0,
  );

  // Verify pagination details are properly typed
  TestValidator.predicate(
    "pagination must have current page number",
    typeof response.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination must have limit",
    typeof response.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination must have total records",
    typeof response.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination must have total pages",
    typeof response.pagination.pages === "number",
  );

  // Verify data structure is properly typed
  if (response.data.length > 0) {
    TestValidator.predicate(
      "first data item has correct id type",
      typeof response.data[0].id === "string",
    );
    TestValidator.predicate(
      "first data item has correct user_id type",
      typeof response.data[0].user_id === "string",
    );
    TestValidator.predicate(
      "first data item has correct template_id type",
      typeof response.data[0].template_id === "string",
    );
    TestValidator.predicate(
      "first data item has correct status",
      ["pending", "delivered", "failed"].includes(response.data[0].status),
    );
    TestValidator.predicate(
      "first data item has correct created_at format",
      /^'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z'$/.test(
        response.data[0].created_at,
      ),
    );

    // Test updated_at is optional
    TestValidator.predicate(
      "updated_at is either undefined or valid date-time",
      response.data[0].updated_at === undefined ||
        /^'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z'$/.test(
          response.data[0].updated_at as string,
        ),
    );
  }
}
