import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

export async function test_api_admin_metadata_update_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "admin_password_123",
        first_name: "Admin",
        last_name: "User",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial test configuration with known validation rules
  const configKey = "test.validation.config";
  const initialMetadata: ITodoAppSystemMetadata =
    await api.functional.todoApp.admin.system.metadata.update(connection, {
      configKey: configKey,
      body: {
        config_value: "50", // String value representing number 50
        config_type: "number",
        category: "system_limits",
        description: "Test configuration for validation testing",
        is_active: true,
        is_system_config: false,
        environment_scope: "development",
        validation_schema: JSON.stringify({
          type: "number",
          minimum: 1,
          maximum: 100,
        }),
        min_value: "1",
        max_value: "100",
        allowed_values: '["25", "50", "75", "100"]',
        default_value: "50",
      } satisfies ITodoAppSystemMetadata.IUpdate,
    });
  typia.assert(initialMetadata);

  // Step 3: Test updating with value exceeding maximum constraint
  await TestValidator.error(
    "should reject value exceeding maximum constraint",
    async () => {
      await api.functional.todoApp.admin.system.metadata.update(connection, {
        configKey: configKey,
        body: {
          config_value: "150", // Exceeds maximum of 100
        } satisfies ITodoAppSystemMetadata.IUpdate,
      });
    },
  );

  // Step 4: Test updating with value below minimum constraint
  await TestValidator.error(
    "should reject value below minimum constraint",
    async () => {
      await api.functional.todoApp.admin.system.metadata.update(connection, {
        configKey: configKey,
        body: {
          config_value: "0", // Below minimum of 1
        } satisfies ITodoAppSystemMetadata.IUpdate,
      });
    },
  );

  // Step 5: Test updating with value not in allowed enumeration
  await TestValidator.error(
    "should reject value not in allowed enumeration",
    async () => {
      await api.functional.todoApp.admin.system.metadata.update(connection, {
        configKey: configKey,
        body: {
          config_value: "60", // Not in allowed values [25, 50, 75, 100]
        } satisfies ITodoAppSystemMetadata.IUpdate,
      });
    },
  );

  // Step 6: Test updating with invalid data type
  await TestValidator.error("should reject invalid data type", async () => {
    await api.functional.todoApp.admin.system.metadata.update(connection, {
      configKey: configKey,
      body: {
        config_type: "invalid_type", // Invalid type not in [string, number, boolean, json, url]
      } satisfies ITodoAppSystemMetadata.IUpdate,
    });
  });

  // Step 7: Test updating with invalid category
  await TestValidator.error("should reject invalid category", async () => {
    await api.functional.todoApp.admin.system.metadata.update(connection, {
      configKey: configKey,
      body: {
        category: "invalid_category", // Not in valid categories list
      } satisfies ITodoAppSystemMetadata.IUpdate,
    });
  });

  // Step 8: Test updating with invalid environment scope
  await TestValidator.error(
    "should reject invalid environment scope",
    async () => {
      await api.functional.todoApp.admin.system.metadata.update(connection, {
        configKey: configKey,
        body: {
          environment_scope: "invalid_scope", // Not in [all, development, staging, production]
        } satisfies ITodoAppSystemMetadata.IUpdate,
      });
    },
  );

  // Step 9: Verify original configuration is still intact by reading it
  const finalMetadata: ITodoAppSystemMetadata =
    await api.functional.todoApp.admin.system.metadata.update(connection, {
      configKey: configKey,
      body: {}, // Empty update to retrieve current state
    });
  typia.assert(finalMetadata);

  // Step 10: Validate that original values remain unchanged
  TestValidator.equals(
    "config_value should remain unchanged",
    finalMetadata.config_value,
    initialMetadata.config_value,
  );
  TestValidator.equals(
    "config_type should remain unchanged",
    finalMetadata.config_type,
    initialMetadata.config_type,
  );
  TestValidator.equals(
    "category should remain unchanged",
    finalMetadata.category,
    initialMetadata.category,
  );
  TestValidator.equals(
    "environment_scope should remain unchanged",
    finalMetadata.environment_scope,
    initialMetadata.environment_scope,
  );

  TestValidator.predicate(
    "configuration integrity maintained",
    finalMetadata.config_value === initialMetadata.config_value &&
      finalMetadata.config_type === initialMetadata.config_type &&
      finalMetadata.category === initialMetadata.category &&
      finalMetadata.environment_scope === initialMetadata.environment_scope,
  );
}
