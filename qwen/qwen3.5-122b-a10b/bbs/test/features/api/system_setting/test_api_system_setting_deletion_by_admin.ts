import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_settings_create } from "../../../generate/generate_random_discussion_board_admin_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

/**
 * Test system setting deletion by administrator.
 *
 * Validates that an administrator can successfully delete a system configuration
 * setting through soft deletion, and that the setting key can be reused after deletion.
 */
export async function test_api_system_setting_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a system setting
  const settingKey = `test_setting_${RandomGenerator.alphabets(8)}`;
  const createdSetting =
    await generate_random_discussion_board_admin_system_settings_create(
      adminConnection,
      {
        body: {
          key: settingKey,
          value: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals("setting key matches", createdSetting.key, settingKey);
  // 3. Delete the system setting
  await api.functional.discussionBoard.admin.system.settings.erase(
    adminConnection,
    {
      settingKey: settingKey,
    },
  );
  // 4. Verify deletion succeeded (no error thrown)
  // The erase function returns void, so successful completion is implicit
  // 5. Verify the setting key can be reused after soft deletion
  const reusedSetting =
    await generate_random_discussion_board_admin_system_settings_create(
      adminConnection,
      {
        body: {
          key: settingKey,
          value: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(reusedSetting);
  TestValidator.equals(
    "reused setting key matches",
    reusedSetting.key,
    settingKey,
  );
  TestValidator.notEquals(
    "reused setting has different value",
    reusedSetting.value,
    createdSetting.value,
  );
}
