import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_invalid_type_value(
  connection: api.IConnection,
) {
  // Test retrieval of notification templates with invalid type value 'invalid_type'
  // to verify system rejects non-predefined notification types with appropriate error response.
  // Validates allowed type constraint enforcement.

  await TestValidator.error(
    "API should reject invalid notification type 'invalid_type'",
    async () => {
      await api.functional.shoppingMall.notifications.templates.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            type: "invalid_type", // Invalid type value not in allowed set
          } satisfies IShoppingMallNotificationTemplate.IRequest,
        },
      );
    },
  );
}
