import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_db_migrations_superadministrator_view_execution_details(
  connection: api.IConnection,
): Promise<void> {
  // Create a super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authorize as super administrator using join
  const authResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authResult);
  // Use the authorized connection for the migration retrieval
  const migration =
    await api.functional.ecommerce.superAdministrator.db_migrations.at(
      superAdminConnection,
      {
        migrationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(migration);
  // Validate all required fields are present
  TestValidator.predicate("has id", migration.id !== undefined);
  TestValidator.predicate(
    "has migration_name",
    migration.migration_name !== undefined,
  );
  TestValidator.predicate("has version", migration.version !== undefined);
  TestValidator.predicate(
    "has description",
    migration.description !== undefined,
  );
  TestValidator.predicate(
    "has executed_at",
    migration.executed_at !== undefined,
  );
  TestValidator.predicate(
    "has execution_status",
    migration.execution_status !== undefined,
  );
  TestValidator.predicate(
    "has rollback_capable",
    migration.rollback_capable !== undefined,
  );
  TestValidator.predicate("has checksum", migration.checksum !== undefined);
  TestValidator.predicate("has created_at", migration.created_at !== undefined);
  TestValidator.predicate("has updated_at", migration.updated_at !== undefined);
  // Validate specific metadata values
  TestValidator.predicate(
    "status should be 'completed'",
    migration.execution_status === "completed",
  );
  TestValidator.predicate(
    "execution_duration_ms should be positive or null",
    migration.execution_duration_ms === null ||
      migration.execution_duration_ms === undefined ||
      migration.execution_duration_ms >= 0,
  );
  // Validate timestamp formatting
  TestValidator.predicate("executed_at is valid date-time", () => {
    try {
      new Date(migration.executed_at);
      return true;
    } catch {
      return false;
    }
  });
  // Validate optional/nullable fields
  if (
    migration.rollback_executed_at !== null &&
    migration.rollback_executed_at !== undefined
  ) {
    TestValidator.predicate("rollback_executed_at is valid date-time", () => {
      try {
        new Date(migration.rollback_executed_at!);
        return true;
      } catch {
        return false;
      }
    });
  }
  if (
    migration.error_message !== null &&
    migration.error_message !== undefined
  ) {
    TestValidator.predicate(
      "error_message is valid string",
      typeof migration.error_message === "string",
    );
  }
  // Validate that deleted_at is properly null if not used
  TestValidator.predicate(
    "deleted_at is either null, undefined, or valid date-time",
    migration.deleted_at === null ||
      migration.deleted_at === undefined ||
      (typeof migration.deleted_at === "string" &&
        !isNaN(new Date(migration.deleted_at).getTime())),
  );
}
