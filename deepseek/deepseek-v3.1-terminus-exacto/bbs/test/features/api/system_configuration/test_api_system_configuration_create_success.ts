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
import { generate_random_discussion_board_super_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_super_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

/**
 * Test successful creation of a new system configuration parameter with all required fields.
 * Authenticates as super administrator, then creates a system configuration with valid data
 * including unique config_key, properly formatted config_value, data_type specification,
 * comprehensive description, appropriate category, and sensitivity flag.
 * Validates the response includes all system-generated fields and matches input data.
 */
export async function test_api_system_configuration_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // Step 2: Create system configuration with valid data
  const configData = {
    config_key: `test.config.${RandomGenerator.alphabets(10)}`,
    config_value: typia.random<number & tags.Type<"uint32">>().toString(),
    data_type: "integer" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    category: "performance",
    is_sensitive: false,
  } satisfies IDiscussionBoardSystemConfiguration.ICreate;
  const createdConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.create(
      superAdminConnection,
      { body: configData },
    );
  typia.assert(createdConfig);
  // Step 3: Validate system-generated fields
  TestValidator.predicate(
    "should have UUID id",
    /^[0-9a-f-]{36}$/i.test(createdConfig.id),
  );
  TestValidator.predicate(
    "should have created_at timestamp",
    new Date(createdConfig.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "should have updated_at timestamp",
    new Date(createdConfig.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted_at should be null",
    createdConfig.deleted_at,
    null,
  );
  // Step 4: Validate input data matches response
  TestValidator.equals(
    "config_key should match",
    createdConfig.config_key,
    configData.config_key,
  );
  TestValidator.equals(
    "config_value should match",
    createdConfig.config_value,
    configData.config_value,
  );
  TestValidator.equals(
    "data_type should match",
    createdConfig.data_type,
    configData.data_type,
  );
  TestValidator.equals(
    "description should match",
    createdConfig.description,
    configData.description,
  );
  TestValidator.equals(
    "category should match",
    createdConfig.category,
    configData.category,
  );
  TestValidator.equals(
    "is_sensitive should match",
    createdConfig.is_sensitive,
    configData.is_sensitive,
  );
  // Step 5: Test different data type scenarios
  const stringConfigData = {
    config_key: `test.string.${RandomGenerator.alphabets(8)}`,
    config_value: RandomGenerator.paragraph({ sentences: 1 }),
    data_type: "string" as const,
    description: "Test string configuration",
    category: "content",
    is_sensitive: true,
  } satisfies IDiscussionBoardSystemConfiguration.ICreate;
  const stringConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.create(
      superAdminConnection,
      { body: stringConfigData },
    );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config_value should match",
    stringConfig.config_value,
    stringConfigData.config_value,
  );
  TestValidator.equals(
    "string data_type should be string",
    stringConfig.data_type,
    "string",
  );
  TestValidator.equals(
    "sensitive flag should be true",
    stringConfig.is_sensitive,
    true,
  );
}