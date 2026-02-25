import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_configuration_data_type_validation(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(auth);
  // Test data type validation by retrieving existing configurations
  // Since we cannot create configurations, we'll test the data type handling
  // by ensuring the API properly handles different data types in responses
  // Create a known configuration ID (this would need to exist in the database)
  // For testing purposes, we'll use a valid UUID format
  const testConfigurationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the configuration
  // This will test the API's handling of the data_type field in responses
  const configuration =
    await api.functional.discussionBoard.superAdmin.system_configurations.at(
      superAdminConnection,
      {
        configurationId: testConfigurationId,
      },
    );
  typia.assert(configuration);
  // Validate that the configuration has a valid data_type
  const validDataTypes = [
    "string",
    "integer",
    "boolean",
    "number",
    "json",
  ] as const;
  TestValidator.predicate(
    "data_type should be one of the valid types",
    validDataTypes.includes(
      configuration.data_type as (typeof validDataTypes)[number],
    ),
  );
  // Validate config_value formatting based on the actual data_type
  switch (configuration.data_type) {
    case "string":
      TestValidator.predicate(
        "string config_value should be a string",
        typeof configuration.config_value === "string",
      );
      break;
    case "integer":
      TestValidator.predicate(
        "integer config_value should be a valid integer string",
        () => {
          const num = parseInt(configuration.config_value);
          return !isNaN(num) && Number.isInteger(num);
        },
      );
      break;
    case "boolean":
      TestValidator.predicate(
        "boolean config_value should be 'true' or 'false'",
        configuration.config_value === "true" ||
          configuration.config_value === "false",
      );
      break;
    case "number":
      TestValidator.predicate(
        "number config_value should be a valid number string",
        () => {
          const num = parseFloat(configuration.config_value);
          return !isNaN(num);
        },
      );
      break;
    case "json":
      TestValidator.predicate("json config_value should be valid JSON", () => {
        try {
          JSON.parse(configuration.config_value);
          return true;
        } catch {
          return false;
        }
      });
      break;
  }
  // Additional validation: Ensure timestamps are valid
  TestValidator.predicate("created_at should be valid date-time", () => {
    const date = new Date(configuration.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at should be valid date-time", () => {
    const date = new Date(configuration.updated_at);
    return !isNaN(date.getTime());
  });
}
