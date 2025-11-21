import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_invalid_page_0(
  connection: api.IConnection,
) {
  await TestValidator.error("invalid page 0 should fail", async () => {
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 0,
          limit: 20,
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  });
}
