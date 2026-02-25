import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDbMigration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_db_migrations_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Test 1: Search with start date range only
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const response1 =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          executed_at_start: startDate satisfies string &
            tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response1);
  // Test 2: Search with end date range only
  const endDate = new Date().toISOString();
  const response2 =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          executed_at_end: endDate satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response2);
  // Test 3: Search with combined date range
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const response3 =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          executed_at_start: yesterday satisfies string &
            tags.Format<"date-time">,
          executed_at_end: tomorrow satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response3);
  // Test 4: Search with narrow timestamp range
  const exactStart = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const exactEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const response4 =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          executed_at_start: exactStart satisfies string &
            tags.Format<"date-time">,
          executed_at_end: exactEnd satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(response4);
  // Test 5: Search without date filters (baseline)
  const baselineResponse =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(baselineResponse);
  // Validate responses have proper pagination structure
  TestValidator.predicate(
    "response1 has pagination",
    response1.pagination !== undefined,
  );
  TestValidator.predicate(
    "response2 has pagination",
    response2.pagination !== undefined,
  );
  TestValidator.predicate(
    "response3 has pagination",
    response3.pagination !== undefined,
  );
  TestValidator.predicate(
    "response4 has pagination",
    response4.pagination !== undefined,
  );
  // Validate pagination fields
  TestValidator.predicate(
    "pagination current >= 0",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response1.pagination.pages >= 0,
  );
  // Validate data structure for first response
  if (response1.data.length > 0) {
    const migration = response1.data[0];
    TestValidator.predicate(
      "migration has id",
      typeof migration.id === "string",
    );
    TestValidator.predicate(
      "migration has migration_name",
      typeof migration.migration_name === "string",
    );
    TestValidator.predicate(
      "migration has version",
      typeof migration.version === "string",
    );
    TestValidator.predicate(
      "migration has description",
      typeof migration.description === "string",
    );
    TestValidator.predicate(
      "migration has executed_at",
      typeof migration.executed_at === "string",
    );
    TestValidator.predicate(
      "migration has execution_status",
      typeof migration.execution_status === "string",
    );
    TestValidator.predicate(
      "migration has rollback_capable",
      typeof migration.rollback_capable === "boolean",
    );
    TestValidator.predicate(
      "migration has created_at",
      typeof migration.created_at === "string",
    );
    TestValidator.predicate(
      "migration has updated_at",
      typeof migration.updated_at === "string",
    );
  }
}
