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

export async function test_api_system_setting_not_found_for_invalid_key(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Generate random non-existent configuration key
  const nonExistentKey = `non_existent_config_${RandomGenerator.alphabets(8)}`;
  // Test 1: Attempt to retrieve non-existent configuration
  await TestValidator.error(
    "should return 404 for non-existent setting",
    async () => {
      await api.functional.discussionBoard.admin.settings.at(adminConnection, {
        settingId: nonExistentKey,
      });
    },
  );
  // Test 2: Test with another random non-existent key for consistency
  const anotherNonExistentKey = `another_unknown_config_${RandomGenerator.alphabets(12)}`;
  await TestValidator.error(
    "should consistently return 404 for different invalid keys",
    async () => {
      await api.functional.discussionBoard.admin.settings.at(adminConnection, {
        settingId: anotherNonExistentKey,
      });
    },
  );
  // Test 3: Test with special characters in key
  const specialKey = `special-config_key.test`;
  await TestValidator.error(
    "should handle special characters in invalid keys",
    async () => {
      await api.functional.discussionBoard.admin.settings.at(adminConnection, {
        settingId: specialKey,
      });
    },
  );
}
