import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

/**
 * Test successful retrieval of system metadata configuration by authenticated
 * admin user.
 *
 * This test validates the complete admin metadata retrieval workflow including:
 *
 * 1. Admin user authentication via join operation with proper credentials
 * 2. JWT token establishment for administrative access
 * 3. System metadata retrieval using authenticated admin session
 * 4. Complete validation of returned metadata including all configuration fields
 *
 * The test ensures that administrative users can properly authenticate and
 * access system configuration data with appropriate role-based permissions. It
 * validates the entire flow from admin creation through metadata retrieval with
 * comprehensive data integrity verification.
 */
export async function test_api_admin_metadata_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Create admin user for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = typia.random<string>();
  const adminRoleLevel: string = typia.random<
    "super_admin" | "admin" | "moderator"
  >();
  const adminStatus: string = "active";

  const adminUser: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: adminRoleLevel,
        status: adminStatus,
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminUser);

  // Step 2: Generate meaningful configuration key for metadata retrieval
  const configKey: string = typia.random<
    string & tags.Pattern<"^[a-z]+\\.[a-z]+\\.[a-z]+$">
  >();

  // Step 3: Retrieve system metadata using authenticated admin session
  const metadata: ITodoAppSystemMetadata =
    await api.functional.todoApp.admin.system.metadata.getByConfigkey(
      connection,
      {
        configKey: configKey,
      },
    );
  typia.assert(metadata);

  // Step 4: Validate returned metadata structure and content
  TestValidator.equals(
    "config key matches request",
    metadata.config_key,
    configKey,
  );
  TestValidator.equals(
    "config value is present",
    metadata.config_value !== null && metadata.config_value !== undefined,
    true,
  );
  TestValidator.equals(
    "config type is valid",
    metadata.config_type !== null && metadata.config_type !== undefined,
    true,
  );
  TestValidator.equals(
    "category is present",
    metadata.category !== null && metadata.category !== undefined,
    true,
  );
  TestValidator.equals(
    "description is present",
    metadata.description !== null && metadata.description !== undefined,
    true,
  );
  TestValidator.equals(
    "is_active is boolean",
    typeof metadata.is_active === "boolean",
    true,
  );
  TestValidator.equals(
    "is_system_config is boolean",
    typeof metadata.is_system_config === "boolean",
    true,
  );
  TestValidator.equals(
    "environment_scope is present",
    metadata.environment_scope !== null &&
      metadata.environment_scope !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at is valid date",
    typia.is<string & tags.Format<"date-time">>(metadata.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at is valid date",
    typia.is<string & tags.Format<"date-time">>(metadata.updated_at),
    true,
  );
}
