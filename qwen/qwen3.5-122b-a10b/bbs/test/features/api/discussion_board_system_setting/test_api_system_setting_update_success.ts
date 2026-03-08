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
 * Test administrator successfully updates a system setting.
 * 1. Authenticate as administrator
 * 2. Create a system setting with unique key and initial value
 * 3. Update the setting's value and description
 * 4. Verify the updated setting has correct value, description, and updated_at changed
 * 5. Verify the key and created_at remain unchanged
 */
export async function test_api_system_setting_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a system setting with unique key and initial value
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdSetting =
    await generate_random_discussion_board_admin_system_settings_create(
      adminConnection,
      {
        body: {
          key: settingKey,
          value: "initial_value",
          description: initialDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  // Store original timestamps for comparison
  const originalCreatedAt = createdSetting.created_at;
  // 3. Update the setting's value and description
  const newValue = "updated_value_" + RandomGenerator.alphaNumeric(8);
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedSetting =
    await api.functional.discussionBoard.admin.system.settings.update(
      adminConnection,
      {
        settingKey: settingKey,
        body: {
          value: newValue,
          description: newDescription,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);
  // 4. Verify the updated setting has correct value, description, and updated_at changed
  TestValidator.equals(
    "setting key remains unchanged",
    updatedSetting.key,
    settingKey,
  );
  TestValidator.equals(
    "value updated correctly",
    updatedSetting.value,
    newValue,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedSetting.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedSetting.updated_at,
    originalCreatedAt,
  );
  // 5. Verify the key and created_at remain unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedSetting.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "setting id unchanged",
    updatedSetting.id,
    createdSetting.id,
  );
}
