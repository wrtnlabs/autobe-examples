import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving platform configurations with boolean data type.
 *
 * Validates that the platform configuration API correctly handles boolean-type
 * configurations where values are stored and returned as string representations
 * ('true' or 'false') rather than actual boolean types. Tests the complete
 * workflow of administrator authentication and configuration retrieval with
 * proper data type validation.
 *
 * Test flow:
 *
 * 1. Create administrator account with join endpoint for authentication
 * 2. Retrieve boolean-type configurations using the configurations API
 * 3. Validate data_type field identifies settings as 'boolean'
 * 4. Confirm value field contains string representations ('true'/'false')
 * 5. Verify timestamps are ISO 8601 formatted
 * 6. Test multiple boolean configurations for consistency
 */
export async function test_api_platform_configuration_boolean_value_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.equals(
    "administrator email matches input",
    administrator.email,
    adminEmail,
  );

  // Step 2: Test boolean configuration retrieval with representative boolean config keys
  const booleanConfigKeys = ["voting_enabled", "comments_enabled"];

  const configurations = await ArrayUtil.asyncMap(
    booleanConfigKeys,
    async (key) => {
      const config: ICommunityPlatformConfiguration =
        await api.functional.communityPlatform.administrator.configurations.at(
          connection,
          {
            configurationKey: key,
          },
        );
      typia.assert(config);
      return config;
    },
  );

  // Step 3: Validate boolean configuration properties
  TestValidator.predicate(
    "retrieved at least one boolean configuration",
    configurations.length > 0,
  );

  // Step 4: Validate each boolean configuration
  for (const config of configurations) {
    // Validate data_type field identifies as 'boolean'
    TestValidator.equals(
      `configuration ${config.key} data_type is boolean`,
      config.data_type,
      "boolean",
    );

    // Validate value field contains string representation of boolean
    TestValidator.predicate(
      `configuration ${config.key} value is string 'true' or 'false'`,
      config.value === "true" || config.value === "false",
    );

    // Validate value is not a boolean type but a string
    TestValidator.predicate(
      `configuration ${config.key} value is string type not boolean`,
      typeof config.value === "string",
    );

    // Validate timestamps are in ISO 8601 format
    TestValidator.predicate(
      `configuration ${config.key} created_at is valid ISO date`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.created_at),
    );

    TestValidator.predicate(
      `configuration ${config.key} updated_at is valid ISO date`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(config.updated_at),
    );

    // Validate configuration key is non-empty
    TestValidator.predicate(
      `configuration key is not empty`,
      config.key.length > 0,
    );

    // Validate id is UUID format
    TestValidator.predicate(
      `configuration id is UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
    );
  }

  // Step 5: Verify consistency across multiple boolean configurations
  TestValidator.predicate(
    "all boolean configurations have string values not boolean types",
    configurations.every(
      (config) =>
        typeof config.value === "string" &&
        (config.value === "true" || config.value === "false"),
    ),
  );

  TestValidator.predicate(
    "all configurations have boolean data_type",
    configurations.every((config) => config.data_type === "boolean"),
  );
}
