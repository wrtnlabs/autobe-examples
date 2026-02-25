import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

export async function test_api_system_configuration_update_sensitive_flag_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sensitive configuration using utility function
  const sensitiveConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10) + "_sensitive",
          config_value: RandomGenerator.alphabets(20),
          data_type: "string" as const,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "security",
          is_sensitive: true,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveConfig);
  // Create non-sensitive configuration using utility function
  const nonSensitiveConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10) + "_nonsensitive",
          config_value: typia.random<number & tags.Type<"int32">>().toString(),
          data_type: "integer" as const,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "general",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(nonSensitiveConfig);
  // Test 1: Transition sensitive to non-sensitive
  const updatedSensitiveToNon =
    await api.functional.discussionBoard.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: sensitiveConfig.id,
        body: {
          is_sensitive: false,
          config_value: RandomGenerator.alphabets(15),
          description: "Transitioned from sensitive to non-sensitive",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedSensitiveToNon);
  TestValidator.equals(
    "sensitive flag transition to false",
    updatedSensitiveToNon.is_sensitive,
    false,
  );
  TestValidator.notEquals(
    "config value should change",
    updatedSensitiveToNon.config_value,
    sensitiveConfig.config_value,
  );
  TestValidator.equals(
    "config key preserved",
    updatedSensitiveToNon.config_key,
    sensitiveConfig.config_key,
  );
  // Test 2: Transition non-sensitive to sensitive
  const updatedNonToSensitive =
    await api.functional.discussionBoard.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: nonSensitiveConfig.id,
        body: {
          is_sensitive: true,
          config_value: RandomGenerator.alphabets(15),
          description: "Transitioned from non-sensitive to sensitive",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedNonToSensitive);
  TestValidator.equals(
    "non-sensitive flag transition to true",
    updatedNonToSensitive.is_sensitive,
    true,
  );
  TestValidator.notEquals(
    "config value should change",
    updatedNonToSensitive.config_value,
    nonSensitiveConfig.config_value,
  );
  TestValidator.equals(
    "config key preserved",
    updatedNonToSensitive.config_key,
    nonSensitiveConfig.config_key,
  );
  // Test 3: Update configuration properties while maintaining sensitivity flag
  const finalUpdate =
    await api.functional.discussionBoard.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: updatedSensitiveToNon.id,
        body: {
          config_value: RandomGenerator.alphabets(12),
          data_type: "string",
          category: "performance",
          description: "Final description after multiple updates",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.equals(
    "sensitivity flag maintained",
    finalUpdate.is_sensitive,
    false,
  );
  TestValidator.notEquals(
    "final config value should be updated",
    finalUpdate.config_value,
    updatedSensitiveToNon.config_value,
  );
  TestValidator.equals("final data type", finalUpdate.data_type, "string");
  TestValidator.equals("final category", finalUpdate.category, "performance");
  // Validate timestamps are updated appropriately
  TestValidator.predicate(
    "updated timestamp should be later than created",
    new Date(finalUpdate.updated_at).getTime() >
      new Date(finalUpdate.created_at).getTime(),
  );
}
