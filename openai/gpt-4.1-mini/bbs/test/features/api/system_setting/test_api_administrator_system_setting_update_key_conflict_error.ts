import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_setting_update_key_conflict_error(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to update a system configuration setting with a key that conflicts with an existing setting's key.
  // The test authenticates an administrator by join operation first.
  // Then attempts to update an existing system setting by UUID providing a key value that already exists in another setting,
  // expecting an error response indicating key uniqueness violation.
  // This validates proper handling of duplicate key conflicts and security authorization.
  // Step 1. Administrator join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // Step 2. Create first system setting with unique key
  // Use a random UUID to create a setting by update (simulate creation)
  const firstSettingId = typia.random<string & tags.Format<"uuid">>();
  const firstKey = `key_${RandomGenerator.alphaNumeric(6)}`;
  const firstSetting =
    await api.functional.discussionBoard.administrator.systemSettings.update(
      adminConnection,
      {
        id: firstSettingId,
        body: {
          key: firstKey,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          deleted_at: null,
        },
      },
    );
  typia.assert(firstSetting);
  // Step 3. Try to update the same setting with a duplicate key
  // The key duplicates the firstKey, expecting error due to conflict
  await TestValidator.error(
    "update system setting with key conflict",
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.update(
        adminConnection,
        {
          id: firstSettingId,
          body: {
            key: firstKey, // duplicate key (same as before)
            value: RandomGenerator.paragraph({ sentences: 1 }),
            description: null,
            deleted_at: null,
          },
        },
      );
    },
  );
}
