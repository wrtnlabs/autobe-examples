import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test the creation of a new system configuration with string data type.
 * 1. Authenticate as super administrator using join
 * 2. Create a system configuration with string data type
 * 3. Validate the configuration object structure and values
 */
export async function test_api_system_configuration_create_string_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } as unknown as DeepPartial<IDiscussionBoardSuperAdmin.IJoin>,
    },
  );
  typia.assert(joinedSuperAdmin);
  // 2. Create string-type system configuration
  const configurationBody = {
    key: `articles.pagination.${RandomGenerator.alphabets(8)}`,
    value: RandomGenerator.paragraph({ sentences: 1 }),
    data_type: "string",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardSystemConfiguration.ICreate;
  const configuration =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: configurationBody,
      },
    );
  typia.assert(configuration);
  // 3. Validate configuration properties
  TestValidator.equals(
    "configuration key matches",
    configuration.key,
    configurationBody.key,
  );
  TestValidator.equals(
    "data_type is string",
    configuration.data_type,
    "string",
  );
  TestValidator.equals(
    "value matches input",
    configuration.value,
    configurationBody.value,
  );
  TestValidator.equals(
    "description matches",
    configuration.description,
    configurationBody.description,
  );
  TestValidator.predicate(
    "ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      configuration.id,
    ),
  );
  TestValidator.predicate(
    "has valid created_at",
    !isNaN(new Date(configuration.created_at).getTime()),
  );
  TestValidator.predicate(
    "has valid updated_at",
    !isNaN(new Date(configuration.updated_at).getTime()),
  );
  TestValidator.equals(
    "deleted_at is null for active configuration",
    configuration.deleted_at,
    null,
  );
}
