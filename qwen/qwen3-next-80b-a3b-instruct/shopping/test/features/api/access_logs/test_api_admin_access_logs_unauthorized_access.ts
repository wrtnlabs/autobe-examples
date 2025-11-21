import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccessLog";
import type { IShoppingMallAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_admin_access_logs_unauthorized_access(
  connection: api.IConnection,
) {
  // Create admin account for authenticated access
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test unauthenticated access attempt
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user should not be able to access admin access logs",
    async () => {
      await api.functional.shoppingMall.admin.access.logs.index(
        unauthConnection,
      );
    },
  );

  // Test admin access with proper authentication
  const adminConnection: api.IConnection = connection;
  const adminLogs: IPageIShoppingMallAccessLog =
    await api.functional.shoppingMall.admin.access.logs.index(adminConnection);
  typia.assert(adminLogs);
  TestValidator.predicate(
    "admin should be able to access logs",
    adminLogs.pagination.records >= 0,
  );
}
