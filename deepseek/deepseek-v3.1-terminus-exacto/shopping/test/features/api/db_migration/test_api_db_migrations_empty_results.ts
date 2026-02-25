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

export async function test_api_db_migrations_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Test 1: Search for non-existent migration name
  const response1 =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      adminConnection,
      {
        body: {
          migration_name: RandomGenerator.alphabets(32),
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response1);
  TestValidator.equals(
    "empty data array for non-existent name",
    response1.data.length,
    0,
  );
  TestValidator.equals(
    "zero records in pagination",
    response1.pagination.records,
    0,
  );
  TestValidator.equals("zero total pages", response1.pagination.pages, 0);
  // 3. Test 2: Filter by non-existent execution status
  const response2 =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      adminConnection,
      {
        body: {
          execution_status: "unknown_status",
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "empty data array for unknown status",
    response2.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for unknown status",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for unknown status",
    response2.pagination.pages,
    0,
  );
  // 4. Test 3: Date range outside migration timestamps
  const farFutureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString(); // 10 years in future
  const response3 =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      adminConnection,
      {
        body: {
          executed_at_start: farFutureDate satisfies string &
            tags.Format<"date-time">,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "empty data array for future date range",
    response3.data.length,
    0,
  );
  // 5. Test 4: Combined criteria that won't match
  const response4 =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      adminConnection,
      {
        body: {
          migration_name: "_non_existent_migration_name_",
          version: "999.999.999",
          execution_status: "pending",
          executed_at_start: "2020-01-01T00:00:00.000Z",
          executed_at_end: "2020-01-02T00:00:00.000Z",
          limit: 20,
          page: 1,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "empty data array for combined criteria",
    response4.data.length,
    0,
  );
  // 6. Validate pagination metadata consistency
  TestValidator.equals(
    "limit preserved in response",
    response4.pagination.limit,
    20,
  );
  TestValidator.equals("current page is 1", response4.pagination.current, 1);
}
