import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_super_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

export async function test_api_system_configuration_deletion_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Re-authenticate admin with login to ensure proper session
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(authenticatedAdminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create and authenticate SuperAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  // Re-authenticate SuperAdmin with login to ensure proper session
  const authenticatedSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_login(authenticatedSuperAdminConnection, {
    body: {
      email: superAdminCredentials.email,
      password: superAdminCredentials.password,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // SuperAdmin creates a system configuration
  const config =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      authenticatedSuperAdminConnection,
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
  // Regular admin attempts to delete the configuration (should fail)
  await TestValidator.error(
    "regular admin should not be able to delete system configuration",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_configurations.erase(
        authenticatedAdminConnection,
        {
          configId: config.id,
        },
      );
    },
  );
  // SuperAdmin successfully deletes the configuration
  await api.functional.discussionBoard.superAdmin.system_configurations.erase(
    authenticatedSuperAdminConnection,
    {
      configId: config.id,
    },
  );
}
