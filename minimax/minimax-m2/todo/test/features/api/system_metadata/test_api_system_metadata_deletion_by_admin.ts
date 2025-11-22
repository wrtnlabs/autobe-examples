import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

export async function test_api_system_metadata_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword123!";

  const adminAuth: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create system administrator account
  const systemAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "SystemAdmin123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(systemAdmin);

  // Step 3: Test deletion of a known system configuration
  // Using a common system config key that should exist for testing
  const configKey: string = "system.theme.default";

  // Step 4: Perform soft deletion of the system metadata
  const deletedMetadata: ITodoAppSystemMetadata =
    await api.functional.todoApp.admin.system.metadata.erase(connection, {
      configKey: configKey,
    });
  typia.assert(deletedMetadata);

  // Step 5: Validate soft deletion - configuration should be marked as deleted
  TestValidator.predicate(
    "deleted_at timestamp should be set after deletion",
    deletedMetadata.deleted_at !== null &&
      deletedMetadata.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at should be a valid date-time string",
    typeof deletedMetadata.deleted_at === "string" &&
      !isNaN(Date.parse(deletedMetadata.deleted_at!)),
  );

  // Step 6: Validate that the metadata record still exists but is marked as deleted
  TestValidator.equals(
    "config_key should match the requested deletion key",
    deletedMetadata.config_key,
    configKey,
  );

  // Step 7: Validate audit trail preservation - record should still be retrievable
  TestValidator.predicate(
    "metadata ID should be preserved for audit purposes",
    deletedMetadata.id !== null && deletedMetadata.id !== undefined,
  );

  TestValidator.predicate(
    "created_at timestamp should be preserved",
    deletedMetadata.created_at !== null &&
      deletedMetadata.created_at !== undefined,
  );

  // Step 8: Validate metadata properties are still accessible after soft deletion
  TestValidator.predicate(
    "config_value should remain accessible",
    deletedMetadata.config_value !== null &&
      deletedMetadata.config_value !== undefined,
  );

  TestValidator.predicate(
    "config_type should be preserved",
    deletedMetadata.config_type !== null &&
      deletedMetadata.config_type !== undefined,
  );

  TestValidator.predicate(
    "category should be preserved",
    deletedMetadata.category !== null && deletedMetadata.category !== undefined,
  );

  // Step 9: Validate deletion timestamp is recent and valid
  const deletionTime = new Date(deletedMetadata.deleted_at!);
  const now = new Date();
  const timeDiff = now.getTime() - deletionTime.getTime();

  TestValidator.predicate(
    "deletion should have occurred recently (within test execution time)",
    timeDiff >= 0 && timeDiff <= 60000, // Within last minute
  );

  // Step 10: Validate that updated_at reflects the deletion time
  TestValidator.predicate(
    "updated_at should be set and reflect recent modification",
    deletedMetadata.updated_at !== null &&
      deletedMetadata.updated_at !== undefined &&
      new Date(deletedMetadata.updated_at).getTime() >= deletionTime.getTime(),
  );

  // Step 11: Validate that administrative metadata is preserved
  TestValidator.predicate(
    "administrator tracking should be preserved",
    deletedMetadata.created_by_administrator_id !== null &&
      deletedMetadata.created_by_administrator_id !== undefined,
  );

  // Step 12: Verify soft deletion maintains referential integrity
  TestValidator.predicate(
    "environment scope should remain intact",
    deletedMetadata.environment_scope !== null &&
      deletedMetadata.environment_scope !== undefined,
  );

  TestValidator.predicate(
    "system configuration flag should be preserved",
    typeof deletedMetadata.is_system_config === "boolean",
  );

  TestValidator.predicate(
    "active status should be preserved",
    typeof deletedMetadata.is_active === "boolean",
  );
}
