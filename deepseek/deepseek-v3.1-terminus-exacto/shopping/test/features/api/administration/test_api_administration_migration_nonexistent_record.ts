import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieval of a non-existent migration record by an administrator.
 * Authenticate as administrator using the join endpoint, then attempt to
 * retrieve a migration using a valid UUID format that does not exist in
 * the system. Validate that the response properly indicates the record
 * was not found while maintaining proper UUID validation for the parameter.
 */
export async function test_api_administration_migration_nonexistent_record(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!", // Use a fixed password since RandomGenerator is not available
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a valid UUID that does not exist
  const nonExistentMigrationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent migration record
  await TestValidator.error(
    "retrieve non-existent migration",
    async () =>
      await api.functional.ecommerce.administrator.db_migrations.at(
        adminConnection,
        {
          migrationId: nonExistentMigrationId,
        },
      ),
  );
}
