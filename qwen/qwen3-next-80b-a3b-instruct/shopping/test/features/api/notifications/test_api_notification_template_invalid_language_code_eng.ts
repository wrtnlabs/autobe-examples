import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_invalid_language_code_eng(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid language code 'eng' should be rejected",
    async () => {
      await api.functional.shoppingMall.notifications.templates.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            language: "eng",
          } satisfies IShoppingMallNotificationTemplate.IRequest,
        },
      );
    },
  );
}
