import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";

export async function test_api_notification_queue_filter_by_actor_id(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const request: IShoppingMallNotificationQueue.IRequest = {
    actor_id: admin.id,
  };

  const page: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: request,
      },
    );
  typia.assert(page);

  TestValidator.equals(
    "notification count is non-negative",
    page.pagination.records,
    page.data.length,
  );
}
