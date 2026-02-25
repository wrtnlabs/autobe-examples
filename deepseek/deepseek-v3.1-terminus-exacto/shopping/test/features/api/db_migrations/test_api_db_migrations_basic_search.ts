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

export async function test_api_db_migrations_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Execute basic search without filters to retrieve all migration records
  const searchRequest: IEcommerceDbMigration.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceDbMigration.IRequest;
  const searchResult =
    await api.functional.ecommerce.superAdministrator.db_migrations.index(
      superAdminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.equals(
    "current page matches request",
    searchResult.pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "limit matches request",
    searchResult.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    searchResult.pagination.records / searchResult.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages match metadata",
    searchResult.pagination.pages,
    expectedPages,
  );
  // 4. Validate migration records structure when data is present
  if (searchResult.data.length > 0) {
    const migrationRecord = searchResult.data[0];
    TestValidator.predicate(
      "has migration_name field",
      typeof migrationRecord.migration_name === "string",
    );
    TestValidator.predicate(
      "has version field",
      typeof migrationRecord.version === "string",
    );
    TestValidator.predicate(
      "has execution_status field",
      typeof migrationRecord.execution_status === "string",
    );
    TestValidator.predicate(
      "has executed_at field",
      typeof migrationRecord.executed_at === "string",
    );
    TestValidator.predicate(
      "has rollback_capable field",
      typeof migrationRecord.rollback_capable === "boolean",
    );
    // Validate date-time format for executed_at
    TestValidator.predicate(
      "executed_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(
        migrationRecord.executed_at,
      ),
    );
  }
  // 5. Verify data array length is consistent with pagination
  TestValidator.predicate(
    "data length does not exceed limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
}
