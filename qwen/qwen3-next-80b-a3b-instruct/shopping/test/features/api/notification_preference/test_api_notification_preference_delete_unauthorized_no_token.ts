import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

export async function test_api_notification_preference_delete_unauthorized_no_token(
  connection: api.IConnection,
) {
  // Generate a valid UUID for a notification preference ID
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete a notification preference without authentication token
  // This should fail with a 401 Unauthorized error since no authentication token is provided
  await TestValidator.error(
    "unauthorized access should be rejected without token",
    async () => {
      await api.functional.shoppingMall.customer.notifications.preferences.erase(
        connection,
        {
          preferenceId,
        },
      );
    },
  );
}
