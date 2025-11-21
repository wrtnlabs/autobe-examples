import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_invalid_language_code_en_us(
  connection: api.IConnection,
) {
  // Prepare an invalid language code 'en_us' that uses underscore instead of hyphen
  const invalidLanguageCode = "en_us";

  // Construct request body with invalid language code
  const requestBody = {
    page: 1,
    limit: 10,
    language: invalidLanguageCode,
  } satisfies IShoppingMallNotificationTemplate.IRequest;

  // Verify that the API rejects the invalid language code format with an error
  await TestValidator.error(
    "API should reject invalid language code with underscore (en_us)",
    async () => {
      await api.functional.shoppingMall.notifications.templates.index(
        connection,
        { body: requestBody },
      );
    },
  );
}
