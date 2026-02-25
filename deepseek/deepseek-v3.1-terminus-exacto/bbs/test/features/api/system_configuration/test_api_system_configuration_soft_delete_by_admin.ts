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

export async function test_api_system_configuration_soft_delete_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection with authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a test system configuration using utility function
  const config =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10),
          config_value: RandomGenerator.alphaNumeric(20),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "test",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(config);
  // 3. Perform soft deletion via DELETE endpoint
  await api.functional.discussionBoard.admin.system_configurations.erase(
    adminConnection,
    {
      configurationId: config.id,
    },
  );
  // 4. Since erase returns void and no read endpoint is available in SDK,
  // we rely on successful execution without errors as validation.
  // Alternative validation could include:
  // - Attempting to delete again (should succeed idempotently but might error).
  // - Business logic expectation: configuration marked as deleted.
}
