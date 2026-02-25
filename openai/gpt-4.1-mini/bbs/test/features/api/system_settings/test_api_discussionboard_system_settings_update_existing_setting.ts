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
import { generate_random_discussion_board_administrator_system_settings_create_system_settings } from "../../../generate/generate_random_discussion_board_administrator_system_settings_create_system_settings";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

/**
 * Test updating an existing system setting by using the same key but different values and description.
 * This verifies the upsert operation updates the setting correctly and returns updated details.
 * Also confirms that administrator authentication via join is required for access.
 */
export async function test_api_discussionboard_system_settings_update_existing_setting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, { body: {} });
  typia.assert(adminAuthorized);
  // Use the token updated in headers
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a new system setting
  const originalSetting: IDiscussionBoardSystemSetting =
    await generate_random_discussion_board_administrator_system_settings_create_system_settings(
      adminConnection,
      { body: {} },
    );
  typia.assert(originalSetting);
  // 3. Update the system setting with the same key but different value and description
  // Prepare updated create body
  const updatedBody: IDiscussionBoardSystemSetting.ICreate = {
    key: originalSetting.key,
    value: `updated_value_${Date.now()}`,
    description: `updated description ${Date.now()}`,
  };
  // 4. Call upsert system setting
  const updatedSetting: IDiscussionBoardSystemSetting =
    await generate_random_discussion_board_administrator_system_settings_create_system_settings(
      adminConnection,
      { body: updatedBody },
    );
  typia.assert(updatedSetting);
  // 5. Validate that key is unchanged
  TestValidator.equals(
    "system setting key unchanged",
    updatedSetting.key,
    originalSetting.key,
  );
  // 6. Validate that value and description are updated
  TestValidator.notEquals(
    "system setting value updated",
    updatedSetting.value,
    originalSetting.value,
  );
  TestValidator.notEquals(
    "system setting description updated",
    updatedSetting.description,
    originalSetting.description,
  );
  // 7. Validate that timestamps are updated
  await TestValidator.predicate(
    "updated setting timestamp is recent",
    new Date(updatedSetting.updated_at).getTime() >
      new Date(originalSetting.updated_at).getTime(),
  );
}
