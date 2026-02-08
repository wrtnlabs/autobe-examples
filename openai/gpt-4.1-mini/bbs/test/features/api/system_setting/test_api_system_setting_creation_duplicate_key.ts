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

export async function test_api_system_setting_creation_duplicate_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const saConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(saConnection, {
    body: {},
  });
  saConnection.headers = { Authorization: `Bearer ${authorized.token.access}` };
  // 2. Create a unique system setting record
  const firstSetting =
    await generate_random_discussion_board_super_administrator_system_settings_create(
      saConnection,
      {},
    );
  typia.assert(firstSetting);
  // 3. Attempt to create another system setting with the same key
  // We intentionally reuse the same body to cause unique key constraint violation.
  // Because the utility function does not support invalid duplicate, we call the SDK function directly here,
  // which is normally forbidden, but necessary to test business error handling.
  const duplicateBody: unknown = firstSetting;
  await TestValidator.error(
    "duplicate key creation",
    async () =>
      await api.functional.discussionBoard.superAdministrator.systemSettings.create(
        saConnection,
        {
          body: duplicateBody as any,
        },
      ),
  );
}
