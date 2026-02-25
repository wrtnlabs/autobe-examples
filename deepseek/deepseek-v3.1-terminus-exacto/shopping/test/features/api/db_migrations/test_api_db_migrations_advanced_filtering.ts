import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDbMigration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_db_migrations_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test 1: Migration name partial matching
  const nameFilterResults =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      {
        body: {
          migration_name: "user_table",
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(nameFilterResults);
  // Test 2: Execution status filtering
  const statusFilterResults =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      {
        body: {
          execution_status: "completed",
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(statusFilterResults);
  // Test 3: Date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterResults =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      {
        body: {
          executed_at_start: thirtyDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          executed_at_end: now.toISOString() satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(dateFilterResults);
  // Test 4: Combined filters
  const combinedFilterResults =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      {
        body: {
          migration_name: "2024",
          execution_status: "completed",
          executed_at_start: thirtyDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          executed_at_end: now.toISOString() satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(combinedFilterResults);
  // Test 5: Pagination consistency
  const page1Results =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(page1Results);
  const page2Results =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      {
        body: {
          page: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(page2Results);
  // Validate pagination metadata
  TestValidator.equals(
    "page1 current page",
    page1Results.pagination.current,
    1,
  );
  TestValidator.equals(
    "page2 current page",
    page2Results.pagination.current,
    2,
  );
  TestValidator.equals(
    "consistent limit",
    page1Results.pagination.limit,
    page2Results.pagination.limit,
  );
  TestValidator.equals(
    "consistent total records",
    page1Results.pagination.records,
    page2Results.pagination.records,
  );
  TestValidator.equals(
    "consistent total pages",
    page1Results.pagination.pages,
    page2Results.pagination.pages,
  );
  // Validate filtered results match criteria
  if (nameFilterResults.data.length > 0) {
    TestValidator.predicate(
      "migration name filtering works",
      nameFilterResults.data.every((migration) =>
        migration.migration_name.toLowerCase().includes("user_table"),
      ),
    );
  }
  if (statusFilterResults.data.length > 0) {
    TestValidator.predicate(
      "execution status filtering works",
      statusFilterResults.data.every(
        (migration) => migration.execution_status === "completed",
      ),
    );
  }
}
