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

export async function test_api_system_configuration_duplicate_key_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Create first configuration with unique key
  const firstConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: "test_unique_key_" + RandomGenerator.alphabets(8),
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          category: "test",
          is_sensitive: false,
        },
      },
    );
  typia.assert(firstConfig);
  // Attempt to create configuration with duplicate key
  await TestValidator.error("should reject duplicate config_key", async () => {
    await generate_random_discussion_board_super_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: firstConfig.config_key,
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string" as const,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          category: "test",
          is_sensitive: false,
        },
      },
    );
  });
}
