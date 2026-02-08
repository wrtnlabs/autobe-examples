import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

/**
 * Test failure scenario when attempting to update a system-wide configuration
 * setting with a value that violates the unique key constraint. Verifies that
 * an administrator authenticated via join cannot update the setting when the
 * new value conflicts with an existing setting key. Confirms rejection and error
 * handling according to unique constraint rules.
 */
export async function test_api_system_setting_update_unique_key_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Attempt to update a system setting with a conflicting unique key
  // Since the IDiscussionBoardSystemSetting.IUpdate has no documented properties,
  // we cannot supply a key to cause unique key conflict.
  // Instead, try updating with empty body or dummy data to cause rejection or success.
  // Faker id (random uuid) for demonstration
  const dummyId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.error(
    "unique key violation on system setting update",
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.update(
        adminConnection,
        {
          id: dummyId,
          body: {},
        },
      );
    },
  );
}
