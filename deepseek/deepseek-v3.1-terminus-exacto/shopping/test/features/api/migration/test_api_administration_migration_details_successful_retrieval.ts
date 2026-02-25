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

export async function test_api_administration_migration_details_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join endpoint utility function
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Generate a valid migration ID
  const migrationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve migration details
  const migration =
    await api.functional.ecommerce.administrator.db_migrations.at(
      adminConnection,
      {
        migrationId: migrationId,
      },
    );
  typia.assert(migration);
  // Validate business logic - completed migration should have proper status and timing
  TestValidator.predicate(
    "completed migration has valid execution timestamp",
    new Date(migration.executed_at) <= new Date(),
  );
  TestValidator.predicate(
    "migration has meaningful description",
    migration.description.length > 10,
  );
  TestValidator.predicate(
    "created_at is before or equal to executed_at",
    new Date(migration.created_at) <= new Date(migration.executed_at),
  );
  TestValidator.predicate(
    "updated_at is latest timestamp",
    new Date(migration.updated_at) >= new Date(migration.created_at) &&
      new Date(migration.updated_at) >= new Date(migration.executed_at),
  );
  // Validate soft-deleted records are excluded
  TestValidator.predicate(
    "migration is not soft-deleted",
    migration.deleted_at === null || migration.deleted_at === undefined,
  );
}
