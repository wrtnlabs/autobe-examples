import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";

export async function test_api_notification_delivery_search_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create a fresh admin account for this test
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "securePassword123";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "super_admin" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  // Step 2: Register new admin account
  const registeredAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(registeredAdmin);

  // Step 3: Create a new connection to simulate unauthenticated access
  // This reuses the old connection but clears all headers to simulate an unauthenticated state
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt to search delivery records without authentication - should fail with 401
  await TestValidator.error(
    "unauthenticated user should be denied access to delivery search",
    async () => {
      await api.functional.shoppingMall.admin.notifications.deliveries.index(
        unauthConnection,
        {
          body: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000).toISOString(),
            status: "success",
            delivery_channel: "email",
            template_id: typia.random<string & tags.Format<"uuid">>(),
            queue_id: typia.random<string & tags.Format<"uuid">>(),
            error_code: "UNKNOWN",
            page: 0,
            limit: 10,
          } satisfies IShoppingMallNotificationDelivery.IRequest,
        },
      );
    },
  );
}
