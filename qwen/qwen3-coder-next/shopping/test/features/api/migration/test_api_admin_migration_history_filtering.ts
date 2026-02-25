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

export async function test_api_admin_migration_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connections for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin1@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create multiple migration records using the index endpoint for creation simulation
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const twoDays = 2 * oneDay;
  const threeDays = 3 * oneDay;
  const fourDays = 4 * oneDay;
  // Create migrations with different timestamps
  const migration1 = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        search: "create-users-table",
        startedAt: new Date(now.getTime() - fourDays).toISOString(),
        endedAt: new Date(now.getTime() - threeDays).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(migration1);
  const migration2 = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        search: "add-email-index",
        startedAt: new Date(now.getTime() - twoDays).toISOString(),
        endedAt: new Date(now.getTime() - oneDay).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(migration2);
  const migration3 = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        search: "update-user-columns",
        startedAt: new Date(now.getTime() - oneDay).toISOString(),
        endedAt: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(migration3);
  // 3. Test date range filtering
  const dateRangeResult =
    await api.functional.shoppingMall.admin.migrations.index(connection, {
      body: {
        startedAt: new Date(now.getTime() - twoDays).toISOString(),
        endedAt: new Date(now.getTime() - oneDay).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filtered count",
    dateRangeResult.data.length,
    1,
  );
  // 4. Test partial name search
  const searchResult = await api.functional.shoppingMall.admin.migrations.index(
    connection,
    {
      body: {
        search: "user",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search matches user-related migrations",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain search term",
    searchResult.data.every((migration) =>
      migration.migration_name.includes("user"),
    ),
  );
  // 5. Test pagination
  const paginatedResult =
    await api.functional.shoppingMall.admin.migrations.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSystemMigration.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata correct",
    paginatedResult.pagination.limit === 2,
  );
  // 6. Test empty date range (no results)
  const emptyRangeResult =
    await api.functional.shoppingMall.admin.migrations.index(connection, {
      body: {
        startedAt: new Date(2020, 0, 1).toISOString(),
        endedAt: new Date(2020, 1, 1).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    });
  typia.assert(emptyRangeResult);
  TestValidator.equals(
    "empty date range returns no results",
    emptyRangeResult.data.length,
    0,
  );
  // 7. Test search term with no matches
  const noMatchResult =
    await api.functional.shoppingMall.admin.migrations.index(connection, {
      body: {
        search: "nonexistent-migration-name",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "nonexistent search returns no results",
    noMatchResult.data.length,
    0,
  );
  // 8. Test page beyond available results
  const pageBeyondResult =
    await api.functional.shoppingMall.admin.migrations.index(connection, {
      body: {
        page: 999,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    });
  typia.assert(pageBeyondResult);
  TestValidator.equals(
    "page beyond results returns empty array",
    pageBeyondResult.data.length,
    0,
  );
}
