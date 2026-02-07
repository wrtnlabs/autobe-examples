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

/**
 * Test validation of configuration parameters that contain various types of errors.
 * The super administrator authenticates and submits a mix of valid and invalid
 * configuration parameters including unknown configuration keys, type mismatches
 * (e.g., string value for integer parameter), and format violations. Verify that
 * the response indicates partial success or failed validation status, returns
 * specific error messages for each invalid parameter, and provides accurate error
 * counts. This scenario validates the system's ability to identify and report
 * configuration errors with detailed feedback.
 */
export async function test_api_system_configuration_validation_with_errors(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a mix of valid and invalid configuration parameters
  const configurations: IDiscussionBoardSystemConfigurationValidationItem[] = [
    // Valid configuration
    {
      config_key: "max_file_size",
      data_type: "integer",
      config_value: "1048576",
    } satisfies IDiscussionBoardSystemConfigurationValidationItem,
    // Unknown configuration key
    {
      config_key: "unknown_config_key",
      data_type: "string",
      config_value: "some_value",
    } satisfies IDiscussionBoardSystemConfigurationValidationItem,
    // Type mismatch - string value for integer parameter
    {
      config_key: "max_login_attempts",
      data_type: "integer",
      config_value: "not_a_number",
    } satisfies IDiscussionBoardSystemConfigurationValidationItem,
    // Format violation - invalid email format
    {
      config_key: "admin_email",
      data_type: "string",
      config_value: "invalid_email_format",
    } satisfies IDiscussionBoardSystemConfigurationValidationItem,
    // Another valid configuration
    {
      config_key: "session_timeout",
      data_type: "integer",
      config_value: "3600",
    } satisfies IDiscussionBoardSystemConfigurationValidationItem,
  ];
  // Validate configurations
  const response =
    await api.functional.discussionBoard.superAdmin.system_configurations.validations.validate(
      superAdminConnection,
      {
        body: {
          configurations,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "validation status should be partial_success or failed",
    response.validation_status === "partial_success" ||
      response.validation_status === "failed",
  );
  TestValidator.equals(
    "results count should match input configurations",
    response.results.length,
    configurations.length,
  );
  // Validate individual results
  for (let i = 0; i < configurations.length; i++) {
    const config = configurations[i];
    const result = response.results[i];
    TestValidator.equals(
      `config key ${config.config_key} should match`,
      result.config_key,
      config.config_key,
    );
    TestValidator.equals(
      `config value ${config.config_value} should match`,
      result.config_value,
      config.config_value,
    );
    TestValidator.equals(
      `data type ${config.data_type} should match`,
      result.data_type,
      config.data_type,
    );
    TestValidator.predicate(
      `validation status for ${config.config_key} should be valid or invalid`,
      result.validation_status === "valid" ||
        result.validation_status === "invalid",
    );
  }
  // Validate error counts
  if (
    response.validation_status === "partial_success" ||
    response.validation_status === "failed"
  ) {
    TestValidator.predicate(
      "error count should be defined",
      response.error_count !== undefined,
    );
    if (response.error_count !== undefined) {
      const actualErrorCount = response.results.filter(
        (r) => r.validation_status === "invalid",
      ).length;
      TestValidator.equals(
        "error count should match actual invalid configurations",
        response.error_count,
        actualErrorCount,
      );
    }
  }
  // Validate specific error cases
  const unknownKeyResult = response.results.find(
    (r) => r.config_key === "unknown_config_key",
  );
  if (unknownKeyResult) {
    TestValidator.equals(
      "unknown config key should be invalid",
      unknownKeyResult.validation_status,
      "invalid",
    );
    TestValidator.predicate(
      "unknown config key should have error messages",
      unknownKeyResult.error_messages.length > 0,
    );
  }
  const typeMismatchResult = response.results.find(
    (r) => r.config_key === "max_login_attempts",
  );
  if (typeMismatchResult) {
    TestValidator.equals(
      "type mismatch should be invalid",
      typeMismatchResult.validation_status,
      "invalid",
    );
    TestValidator.predicate(
      "type mismatch should have error messages",
      typeMismatchResult.error_messages.length > 0,
    );
  }
  const formatViolationResult = response.results.find(
    (r) => r.config_key === "admin_email",
  );
  if (formatViolationResult) {
    TestValidator.equals(
      "format violation should be invalid",
      formatViolationResult.validation_status,
      "invalid",
    );
    TestValidator.predicate(
      "format violation should have error messages",
      formatViolationResult.error_messages.length > 0,
    );
  }
  // Validate successful configurations
  const validResults = response.results.filter(
    (r) => r.validation_status === "valid",
  );
  validResults.forEach((validResult) => {
    TestValidator.equals(
      "valid configurations should have empty error messages",
      validResult.error_messages.length,
      0,
    );
  });
}
