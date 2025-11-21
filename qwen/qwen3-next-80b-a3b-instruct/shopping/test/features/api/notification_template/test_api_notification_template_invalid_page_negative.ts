import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationTemplate";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";

export async function test_api_notification_template_invalid_page_negative(
  connection: api.IConnection,
) {
  await TestValidator.error("invalid negative page should fail", async () => {
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: -1,
          limit: 10,
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  });

  const output: IPageIShoppingMallNotificationTemplate.ISummary =
    await api.functional.shoppingMall.notifications.templates.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallNotificationTemplate.IRequest,
      },
    );
  typia.assert(output);
}
