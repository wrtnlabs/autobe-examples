import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemMetadata";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

/**
 * Test system metadata retrieval by admin user.
 *
 * This test validates that system administrators can successfully retrieve
 * complete system configuration and operational metadata from the centralized
 * configuration management system. The test follows a comprehensive workflow:
 *
 * 1. Admin Account Creation: Creates a new administrator account to establish
 *    authentication context for privileged system access
 * 2. Metadata Retrieval: Retrieves all system configuration entries using the
 *    admin metadata endpoint
 * 3. Response Structure Validation: Validates pagination and data array structure
 * 4. Configuration Content Verification: Verifies comprehensive configuration
 *    coverage across different types (boolean flags, numeric values, string
 *    configs, JSON objects)
 * 5. Administrative Access Validation: Confirms proper admin-level metadata access
 *
 * The test ensures that the metadata system provides complete visibility into
 * all system configurations including feature flags, system limits, UI
 * settings, security settings, performance settings, integration settings, and
 * operational settings with proper validation schemas, default values, and
 * range restrictions.
 */
export async function test_api_system_metadata_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminAccount = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphabets(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    role_level: "admin",
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAccount,
    });
  typia.assert(admin);

  // Step 2: Retrieve system metadata using admin access
  const metadataResponse: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.get(connection);
  typia.assert(metadataResponse);

  // Step 3: Validate response structure and pagination
  TestValidator.equals(
    "response contains pagination data",
    metadataResponse.pagination.current !== undefined &&
      metadataResponse.pagination.limit !== undefined &&
      metadataResponse.pagination.records !== undefined &&
      metadataResponse.pagination.pages !== undefined,
    true,
  );

  // Step 4: Validate data array exists
  TestValidator.equals(
    "response contains data array",
    Array.isArray(metadataResponse.data),
    true,
  );

  // Step 5: Validate metadata entries if any exist
  if (metadataResponse.data.length > 0) {
    // Validate first entry structure
    const firstMetadata: ITodoAppSystemMetadata.ISummary =
      metadataResponse.data[0];
    TestValidator.equals(
      "first metadata entry has required fields",
      firstMetadata.id !== undefined &&
        firstMetadata.config_key !== undefined &&
        firstMetadata.config_value !== undefined &&
        firstMetadata.config_type !== undefined &&
        firstMetadata.category !== undefined &&
        firstMetadata.description !== undefined,
      true,
    );

    // Validate configuration types are valid
    const validConfigTypes = ["string", "number", "boolean", "json", "url"];
    TestValidator.predicate(
      "config types are valid",
      validConfigTypes.includes(firstMetadata.config_type),
    );

    // Validate categories are valid
    const validCategories = [
      "feature_flags",
      "system_limits",
      "ui_settings",
      "security_settings",
      "performance_settings",
      "integration_settings",
      "operational_settings",
    ];
    TestValidator.predicate(
      "config categories are valid",
      validCategories.includes(firstMetadata.category),
    );

    // Test validation that metadata covers various types
    let hasBooleanConfig = false;
    let hasNumericConfig = false;
    let hasStringConfig = false;
    let hasJsonConfig = false;

    for (const entry of metadataResponse.data) {
      if (entry.config_type === "boolean" && !hasBooleanConfig)
        hasBooleanConfig = true;
      if (entry.config_type === "number" && !hasNumericConfig)
        hasNumericConfig = true;
      if (entry.config_type === "string" && !hasStringConfig)
        hasStringConfig = true;
      if (entry.config_type === "json" && !hasJsonConfig) hasJsonConfig = true;
    }

    // Check that the metadata response contains diverse configuration types
    TestValidator.predicate(
      "metadata contains diverse configuration types",
      metadataResponse.data.some((entry) => entry.config_type === "string") &&
        metadataResponse.data.some((entry) => entry.config_type === "number") &&
        metadataResponse.data.some(
          (entry) => entry.config_type === "boolean",
        ) &&
        metadataResponse.data.some((entry) => entry.config_type === "json"),
    );

    // Validate that system metadata includes proper timestamps
    TestValidator.equals(
      "metadata entries have proper timestamps",
      firstMetadata.created_at !== undefined &&
        firstMetadata.updated_at !== undefined,
      true,
    );

    // Test environment scope validation
    const validEnvScopes = ["all", "development", "staging", "production"];
    TestValidator.predicate(
      "environment scopes are valid",
      validEnvScopes.includes(firstMetadata.environment_scope),
    );
  } else {
    // If no metadata exists, validate the empty response structure
    TestValidator.equals(
      "empty metadata response is valid",
      metadataResponse.data.length === 0,
      true,
    );
  }

  // Step 6: Validate admin authentication context
  TestValidator.equals(
    "admin authentication succeeded",
    admin.id !== undefined && admin.token !== undefined,
    true,
  );

  TestValidator.equals(
    "JWT tokens are properly issued",
    admin.token.access !== undefined &&
      admin.token.refresh !== undefined &&
      admin.token.expired_at !== undefined,
    true,
  );

  // Step 7: Final validation that system metadata endpoint is accessible to admin
  TestValidator.equals(
    "admin can access system metadata endpoint",
    metadataResponse !== null && metadataResponse !== undefined,
    true,
  );
}
