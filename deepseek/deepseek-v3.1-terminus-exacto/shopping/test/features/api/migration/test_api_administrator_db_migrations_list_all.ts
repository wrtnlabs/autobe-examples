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

export async function test_api_administrator_db_migrations_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Call the database migrations listing endpoint with empty request
  const migrations =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(migrations);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof migrations.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    migrations.pagination.current >= 0,
  );
  TestValidator.predicate("has valid limit", migrations.pagination.limit >= 0);
  TestValidator.predicate(
    "has total records",
    migrations.pagination.records >= 0,
  );
  TestValidator.predicate("has total pages", migrations.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals("has data array", Array.isArray(migrations.data), true);
  // Validate individual migration summary structure if records exist
  if (migrations.data.length > 0) {
    const migration = migrations.data[0];
    TestValidator.equals("has id field", typeof migration.id, "string");
    TestValidator.equals(
      "has migration_name field",
      typeof migration.migration_name,
      "string",
    );
    TestValidator.equals(
      "has version field",
      typeof migration.version,
      "string",
    );
    TestValidator.equals(
      "has description field",
      typeof migration.description,
      "string",
    );
    TestValidator.equals(
      "has executed_at field",
      typeof migration.executed_at,
      "string",
    );
    TestValidator.equals(
      "has execution_status field",
      typeof migration.execution_status,
      "string",
    );
    TestValidator.equals(
      "has rollback_capable field",
      typeof migration.rollback_capable,
      "boolean",
    );
    TestValidator.predicate(
      "executed_at is valid date",
      !isNaN(Date.parse(migration.executed_at)),
    );
  }
}
