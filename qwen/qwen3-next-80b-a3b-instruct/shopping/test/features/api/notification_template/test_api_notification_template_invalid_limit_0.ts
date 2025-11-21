import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_invalid_limit_0(
  connection: api.IConnection,
) {
  // Test retrieval of notification templates with invalid limit value (0)
  // This test validates that the system rejects zero-sized result sets
  // with appropriate error response for the minimum result size constraint.
  // The API endpoint PATCH /shoppingMall/notifications/templates requires limit >= 1
  // as defined in IShoppingMallNotificationTemplate.IRequest interface.
  // This test must verify that sending limit: 0 triggers appropriate
  // error response and does not succeed.

  await TestValidator.error("limit value of 0 must be rejected", async () => {
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0, // Invalid: limit must be >= 1 as per schema requirement
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  });
}
