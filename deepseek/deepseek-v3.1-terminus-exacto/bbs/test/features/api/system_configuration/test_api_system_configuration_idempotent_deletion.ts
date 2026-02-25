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

export async function test_api_system_configuration_idempotent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
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
  // 2. Create a system configuration for testing
  const config =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: "string" as const,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: RandomGenerator.name(1),
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // 3. Perform first deletion
  await api.functional.discussionBoard.admin.system_configurations.erase(
    adminConnection,
    {
      configurationId: config.id,
    },
  );
  // 4. Perform repeated deletions to verify idempotency
  // Execute deletion 3 more times (total of 4 calls counting the first one)
  for (let i = 0; i < 3; i++) {
    await api.functional.discussionBoard.admin.system_configurations.erase(
      adminConnection,
      {
        configurationId: config.id,
      },
    );
  }
  // 5. Verification:
  // - If we reach here without errors, all DELETE calls succeeded
  // - This demonstrates idempotency: repeated operations produce same result
  // Note: Without a GET endpoint, we cannot verify deleted_at timestamp
  // consistency, but successful execution of repeated deletions on the same
  // resource validates the idempotency property as specified in the scenario.
}
