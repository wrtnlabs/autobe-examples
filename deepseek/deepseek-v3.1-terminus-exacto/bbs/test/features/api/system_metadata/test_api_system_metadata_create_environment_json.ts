import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

/**
 * Test creation of environment-specific JSON configuration.
 *
 * Authenticate as superAdmin, create a configuration with JSON data type for
 * production scope containing complex nested structure. Verify the JSON is
 * properly validated and stored as string with data_type='json'. Test different
 * scope formats (staging, development) to ensure scope format conventions are
 * followed. Test integer and float data types with numeric values to ensure
 * proper validation. Edge cases: empty description, special characters in name,
 * maximum length validations.
 */
export async function test_api_system_metadata_create_environment_json(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Test JSON data type with production scope (complex nested structure)
  const jsonConfig1 =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `feature_flags_${Date.now()}`,
          value: JSON.stringify({
            version: "1.0.0",
            features: {
              userManagement: {
                enabled: true,
                permissions: ["create", "read", "update", "delete"],
                thresholds: { maxUsers: 1000, rateLimit: 100 },
              },
              analytics: {
                enabled: false,
                retentionDays: 30,
                metrics: ["active_users", "conversion_rate"],
              },
            },
            overrides: [
              { userId: "user_123", feature: "userManagement", enabled: true },
              { userId: "user_456", feature: "analytics", enabled: false },
            ],
          }),
          data_type: "json",
          scope: "production",
          description: "Production feature flags configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(jsonConfig1);
  TestValidator.equals(
    "data_type should be json",
    jsonConfig1.data_type,
    "json",
  );
  TestValidator.equals(
    "scope should be production",
    jsonConfig1.scope,
    "production",
  );
  TestValidator.predicate(
    "status should be active",
    jsonConfig1.statusType.is_active,
  );
  // 3. Test staging scope with different JSON structure
  const jsonConfig2 =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `staging_config_${Date.now()}`,
          value: JSON.stringify({
            debug: true,
            logLevel: "verbose",
            endpoints: {
              api: "https://staging.api.example.com",
              cdn: "https://staging.cdn.example.com",
            },
            limits: { maxRequests: 5000, timeout: 30000 },
          }),
          data_type: "json",
          scope: "staging",
          description: "Staging environment configuration",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(jsonConfig2);
  TestValidator.equals("staging scope", jsonConfig2.scope, "staging");
  // 4. Test development scope with empty description (null)
  const jsonConfig3 =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `dev_setup_${Date.now()}`,
          value: JSON.stringify({
            local: true,
            port: 3000,
            database: { host: "localhost", port: 5432, name: "dev_db" },
          }),
          data_type: "json",
          scope: "development",
          description: null,
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(jsonConfig3);
  TestValidator.equals("development scope", jsonConfig3.scope, "development");
  TestValidator.equals("null description", jsonConfig3.description, null);
  // 5. Test integer data type with numeric values
  const intConfig =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `max_retries_${Date.now()}`,
          value: "3",
          data_type: "integer",
          scope: "global",
          description: "Maximum retry attempts for API calls",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(intConfig);
  TestValidator.equals("integer data type", intConfig.data_type, "integer");
  // 6. Test float data type with decimal values
  const floatConfig =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `tax_rate_${Date.now()}`,
          value: "0.0825",
          data_type: "float",
          scope: "production",
          description: "Sales tax rate for transactions",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(floatConfig);
  TestValidator.equals("float data type", floatConfig.data_type, "float");
  // 7. Test edge case: special characters in name
  const specialNameConfig =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `config.with.dots-and-dashes_${Date.now()}`,
          value: "special",
          data_type: "string",
          scope: "global",
          description: "Configuration with special characters in name",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(specialNameConfig);
  TestValidator.predicate(
    "name contains special chars",
    () =>
      specialNameConfig.name.includes(".") ||
      specialNameConfig.name.includes("-"),
  );
  // 8. Test edge case: empty string description (undefined)
  const emptyDescConfig =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: `no_desc_${Date.now()}`,
          value: "test",
          data_type: "string",
          scope: "global",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(emptyDescConfig);
  TestValidator.equals(
    "undefined description",
    emptyDescConfig.description,
    undefined,
  );
  // 9. Test business logic validation for all configurations
  const configs = [
    jsonConfig1,
    jsonConfig2,
    jsonConfig3,
    intConfig,
    floatConfig,
    specialNameConfig,
    emptyDescConfig,
  ];
  for (const config of configs) {
    TestValidator.equals("deleted_at is null", config.deleted_at, null);
    TestValidator.predicate(
      "version is positive integer",
      () => config.version > 0,
    );
    TestValidator.predicate(
      "has statusType",
      () => config.statusType.id.length > 0,
    );
    TestValidator.predicate(
      "statusType is active",
      () => config.statusType.is_active,
    );
  }
}
