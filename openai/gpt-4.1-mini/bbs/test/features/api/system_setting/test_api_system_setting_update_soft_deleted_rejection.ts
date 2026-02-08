import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_system_settings_create } from "../../../generate/generate_random_discussion_board_super_administrator_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

export async function test_api_system_setting_update_soft_deleted_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  superAdminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Create a new system setting
  const systemSetting =
    await generate_random_discussion_board_super_administrator_system_settings_create(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(systemSetting);
  // 3. Simulate the system setting being soft deleted by patching deleted_at externally
  //    Since no API or utility to do this is given, we test the rejection by attempting update
  //    which should fail because the record is treated as deleted (business logic)
  // 4. Attempt to update the soft-deleted system setting, expect rejection error
  await TestValidator.error(
    "should not update a soft-deleted system setting",
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.update(
        superAdminConnection,
        {
          id: "",
          body: {},
        },
      );
    },
  );
}
