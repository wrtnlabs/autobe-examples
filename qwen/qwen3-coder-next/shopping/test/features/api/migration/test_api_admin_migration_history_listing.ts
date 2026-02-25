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

export async function test_api_admin_migration_history_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test basic migration history listing
  const result = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate("has data array", Array.isArray(result.data));
  TestValidator.predicate("has pagination", result.pagination !== undefined);
  TestValidator.equals(
    "pagination has required fields",
    Object.keys(result.pagination).sort(),
    ["current", "limit", "records", "pages"].sort(),
  );
  // Test pagination with different parameters
  const result2 = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(result2);
  // Test filtering by search term
  const result3 = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        search: "init",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(result3);
  // Test filtering by date range
  const startDate = new Date("2024-01-01T00:00:00Z").toISOString();
  const endDate = new Date("2026-12-31T23:59:59Z").toISOString();
  const result4 = await api.functional.shoppingMall.admin.migrations.index(
    adminConnection,
    {
      body: {
        startedAt: startDate satisfies string & tags.Format<"date-time">,
        endedAt: endDate satisfies string & tags.Format<"date-time">,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSystemMigration.IRequest,
    },
  );
  typia.assert(result4);
  // Verify each migration summary has required fields
  for (const migration of result.data) {
    TestValidator.predicate("migration has id", migration.id !== undefined);
    TestValidator.predicate(
      "migration has migration_name",
      migration.migration_name !== undefined,
    );
    TestValidator.predicate(
      "migration has executed_at",
      migration.executed_at !== undefined,
    );
    TestValidator.predicate(
      "migration has migration_hash",
      migration.migration_hash !== undefined,
    );
    TestValidator.predicate(
      "migration has admin_id",
      migration.admin_id !== undefined,
    );
    // Validate UUID format for id fields
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(migration.id),
    );
    TestValidator.predicate(
      "admin_id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(migration.admin_id),
    );
  }
}
