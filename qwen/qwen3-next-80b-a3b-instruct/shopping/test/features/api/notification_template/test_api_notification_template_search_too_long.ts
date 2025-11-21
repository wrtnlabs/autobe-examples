import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_search_too_long(
  connection: api.IConnection,
) {
  const searchTerm = RandomGenerator.alphabets(101);
  await TestValidator.error(
    "search term exceeding 100 characters should fail",
    async () => {
      await api.functional.shoppingMall.notifications.templates.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            search: searchTerm, // This should trigger validation error due to exceeding maxLength<100>
          } satisfies IShoppingMallNotificationTemplate.IRequest,
        },
      );
    },
  );
}
