import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemMigration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemMigration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_migration_history_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin and get connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin@1234" as string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminUser = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminUser);
  // 2. Create super admin and get connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SuperAdmin@1234" as string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const superAdminUser = await authorize_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdminUser);
  // 3. Test regular admin can access migration history
  const adminResponse =
    await api.functional.shoppingMall.admin.migrations.index(adminConnection, {
      body: { page: 1, limit: 20 },
    });
  typia.assert(adminResponse);
  // 4. Test super admin can access migration history
  const superAdminResponse =
    await api.functional.shoppingMall.admin.migrations.index(
      superAdminConnection,
      {
        body: { page: 1, limit: 20 },
      },
    );
  typia.assert(superAdminResponse);
  // 5. Verify migration records structure
  if (adminResponse.data.length > 0) {
    const migration = adminResponse.data[0];
    typia.assert<IShoppingMallSystemMigration.ISummary>(migration);
    // Verify required fields exist
    TestValidator.equals("migration has id", typeof migration.id, "string");
    TestValidator.equals(
      "migration has name",
      typeof migration.migration_name,
      "string",
    );
    TestValidator.equals(
      "migration has timestamp",
      typeof migration.executed_at,
      "string",
    );
    TestValidator.equals(
      "migration has hash",
      typeof migration.migration_hash,
      "string",
    );
    TestValidator.equals(
      "migration has admin_id",
      typeof migration.admin_id,
      "string",
    );
    // Verify admin_id format (should be UUID)
    TestValidator.predicate(
      "admin_id is UUID format",
      /^[0-9a-f-]{36}$/i.test(migration.admin_id),
    );
  }
  // 6. Test pagination works correctly
  const paginatedResponse =
    await api.functional.shoppingMall.admin.migrations.index(adminConnection, {
      body: { page: 1, limit: 5 },
    });
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.equals(
    "pagination metadata exists",
    paginatedResponse.pagination.limit,
    5,
  );
  // 7. Test search functionality
  const searchResponse =
    await api.functional.shoppingMall.admin.migrations.index(adminConnection, {
      body: { page: 1, limit: 20, search: "create" },
    });
  typia.assert(searchResponse);
  // 8. Test unauthorized access (should throw 401 error)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.shoppingMall.admin.migrations.index(
      unauthorizedConnection,
      {
        body: { page: 1, limit: 20 },
      },
    );
    throw new Error("Expected unauthorized access to fail");
  } catch (error) {
    const status = error instanceof Error ? (error as any).status : undefined;
    TestValidator.equals(
      "unauthorized access returns 401",
      status,
      401,
    );
  }
}