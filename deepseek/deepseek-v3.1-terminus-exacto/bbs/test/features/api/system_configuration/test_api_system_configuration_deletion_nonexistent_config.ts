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

export async function test_api_system_configuration_deletion_nonexistent_config(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Attempt to delete a non-existent random UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("delete non-existent configuration", async () => {
    await api.functional.discussionBoard.superAdmin.system_configurations.erase(
      superAdminConnection,
      {
        configId: nonExistentId,
      },
    );
  });
  // Step 3: Create a real configuration for re-deletion test
  const configuration =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(configuration);
  // Step 4: Delete the configuration successfully
  await api.functional.discussionBoard.superAdmin.system_configurations.erase(
    superAdminConnection,
    {
      configId: configuration.id,
    },
  );
  // Step 5: Attempt to delete the same configuration again (already deleted)
  await TestValidator.error(
    "re-delete already deleted configuration",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_configurations.erase(
        superAdminConnection,
        {
          configId: configuration.id,
        },
      );
    },
  );
}
