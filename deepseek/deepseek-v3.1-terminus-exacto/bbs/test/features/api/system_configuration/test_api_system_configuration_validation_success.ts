import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import type { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_configuration_validation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authentication
  const authConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const authResult = await authorize_super_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  typia.assert(authResult);
  // Create separate connection for validation endpoint with authentication headers
  const validationConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authResult.token.access },
  };
  // Create valid configuration parameters for testing
  const configurations = [
    {
      config_key: "site_name",
      data_type: "string",
      config_value: "Discussion Board Platform",
    },
    {
      config_key: "max_file_size",
      data_type: "integer",
      config_value: "10485760", // 10MB in bytes
    },
    {
      config_key: "enable_registration",
      data_type: "boolean",
      config_value: "true",
    },
    {
      config_key: "default_settings",
      data_type: "json",
      config_value: JSON.stringify({ theme: "dark", language: "en" }),
    },
  ] satisfies IDiscussionBoardSystemConfigurationValidationItem[];
  // Validate system configurations
  const validationResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.validations.validate(
      validationConnection,
      {
        body: {
          configurations,
        },
      },
    );
  typia.assert(validationResponse);
  // Validate response success status
  TestValidator.equals(
    "validation status should be success",
    validationResponse.validation_status,
    "success",
  );
  // Validate each configuration result
  validationResponse.results.forEach((result, index) => {
    TestValidator.equals(
      `config key should match input ${index}`,
      result.config_key,
      configurations[index].config_key,
    );
    TestValidator.equals(
      `config value should match input ${index}`,
      result.config_value,
      configurations[index].config_value,
    );
    TestValidator.equals(
      `validation status should be valid ${index}`,
      result.validation_status,
      "valid",
    );
    TestValidator.equals(
      `error messages should be empty ${index}`,
      result.error_messages.length,
      0,
    );
  });
  // Validate error and warning counts
  TestValidator.equals(
    "error count should be zero",
    validationResponse.error_count,
    0,
  );
  TestValidator.equals(
    "warning count should be zero",
    validationResponse.warning_count,
    0,
  );
}
