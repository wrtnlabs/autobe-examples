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

export async function test_api_system_configuration_create_unique_key(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create system configuration using utility function
  const configurationBody = {
    key: "articles.pagination.page_size",
    value: "20",
    data_type: "integer",
    description: "Number of articles per page for pagination",
  } satisfies IDiscussionBoardSystemConfiguration.ICreate;
  const configuration =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      { body: configurationBody },
    );
  typia.assert(configuration);
  // Step 3: Validate business logic (not type validation)
  TestValidator.equals(
    "key matches input",
    configuration.key,
    configurationBody.key,
  );
  TestValidator.equals(
    "value matches input",
    configuration.value,
    configurationBody.value,
  );
  TestValidator.equals(
    "data_type matches input",
    configuration.data_type,
    configurationBody.data_type,
  );
  TestValidator.equals(
    "description matches input",
    configuration.description,
    configurationBody.description,
  );
  TestValidator.equals(
    "created_at equals updated_at for new record",
    configuration.created_at,
    configuration.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    configuration.deleted_at,
    null,
  );
  // Step 4: Verify key uniqueness enforcement
  await TestValidator.error("duplicate key should fail", async () => {
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      { body: configurationBody },
    );
  });
}
