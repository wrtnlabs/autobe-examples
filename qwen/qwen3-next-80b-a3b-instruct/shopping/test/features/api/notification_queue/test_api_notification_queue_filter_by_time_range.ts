import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationQueue";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";

export async function test_api_notification_queue_filter_by_time_range(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate time range for filtering (ISO 8601 format)
  const now = new Date();
  const beforeTimestamp = new Date(now.getTime() - 3600000).toISOString(); // 1 hour ago
  const afterTimestamp = new Date(now.getTime() + 3600000).toISOString(); // 1 hour from now

  // Step 3: Query notifications scheduled before the specified timestamp
  const beforeOnly: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          before: beforeTimestamp,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(beforeOnly);

  // Step 4: Query notifications scheduled after the specified timestamp
  const afterOnly: IPageIShoppingMallNotificationQueue.ISummary =
    await api.functional.shoppingMall.admin.notifications.queue.index(
      connection,
      {
        body: {
          after: afterTimestamp,
        } satisfies IShoppingMallNotificationQueue.IRequest,
      },
    );
  typia.assert(afterOnly);

  // Step 5: Validate both filters returned results
  TestValidator.predicate(
    "notifications scheduled before timestamp exist",
    beforeOnly.data.length > 0,
  );

  TestValidator.predicate(
    "notifications scheduled after timestamp exist",
    afterOnly.data.length > 0,
  );
}
