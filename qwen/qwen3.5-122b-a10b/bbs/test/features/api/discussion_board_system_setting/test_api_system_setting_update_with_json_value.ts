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
 * Test administrator updates a system setting with JSON-formatted string value.
 *
 * This test verifies:
 * 1. Admin authentication for system settings management
 * 2. Creation of system setting with simple string value
 * 3. Update to JSON-formatted string value
 * 4. Description update to null
 * 5. Timestamp validation (updated_at > created_at)
 */
export async function test_api_system_setting_update_with_json_value(
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
  // 2. Create system setting with simple string value
  const settingKey = `test_setting_${RandomGenerator.alphabets(8)}`;
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialBody = {
    key: settingKey,
    value: "simple_value",
    description: initialDescription,
  } satisfies IDiscussionBoardSystemSetting.ICreate;
  const created =
    await api.functional.discussionBoard.admin.system.settings.create(
      adminConnection,
      {
        body: initialBody,
      },
    );
  typia.assert(created);
  TestValidator.equals("setting key matches", created.key, settingKey);
  TestValidator.equals("initial value matches", created.value, "simple_value");
  TestValidator.equals(
    "initial description matches",
    created.description,
    initialDescription,
  );
  // 3. Update setting with JSON-formatted string value
  const jsonValue = JSON.stringify({
    feature: true,
    threshold: 100,
    nested: { enabled: false, maxItems: 50 },
  });
  const updateBody = {
    value: jsonValue,
    description: null,
  } satisfies IDiscussionBoardSystemSetting.IUpdate;
  const updated =
    await api.functional.discussionBoard.admin.system.settings.update(
      adminConnection,
      {
        settingKey: settingKey,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4. Verify JSON string value is stored exactly as provided
  TestValidator.equals("JSON value matches", updated.value, jsonValue);
  TestValidator.equals("description is null", updated.description, null);
  // 5. Verify timestamp was updated
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updated.updated_at) > new Date(created.created_at),
  );
}
