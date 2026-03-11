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

export async function test_api_system_configuration_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a system configuration
  const config =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // 3. Retrieve the configuration using its ID
  const retrievedConfig =
    await api.functional.discussionBoard.admin.system_configurations.at(
      adminConnection,
      {
        configId: config.id,
      },
    );
  typia.assert(retrievedConfig);
  // 4. Validate all configuration fields
  TestValidator.equals(
    "configuration ID matches",
    retrievedConfig.id,
    config.id,
  );
  TestValidator.equals(
    "configuration key matches",
    retrievedConfig.key,
    config.key,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfig.value,
    config.value,
  );
  TestValidator.equals(
    "data_type matches",
    retrievedConfig.data_type,
    config.data_type,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfig.description,
    config.description,
  );
  // Validate timestamps are in ISO format
  TestValidator.predicate("created_at is valid ISO format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedConfig.created_at,
    ),
  );
  TestValidator.predicate("updated_at is valid ISO format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedConfig.updated_at,
    ),
  );
  // Validate deleted_at is null for active configuration
  TestValidator.equals(
    "deleted_at should be null for active config",
    retrievedConfig.deleted_at,
    null,
  );
}
