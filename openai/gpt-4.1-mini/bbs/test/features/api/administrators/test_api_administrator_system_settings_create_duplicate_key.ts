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
import { generate_random_discussion_board_administrator_system_settings_create } from "../../../generate/generate_random_discussion_board_administrator_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

export async function test_api_administrator_system_settings_create_duplicate_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IDiscussionBoardAdministrator.IJoin has no required props
  });
  typia.assert(adminAuthorized);
  // 2. Create a first system setting with random valid data
  const firstSetting =
    await generate_random_discussion_board_administrator_system_settings_create(
      adminConnection,
      {},
    );
  typia.assert(firstSetting);
  // 3. Attempt to create a duplicate system setting using the same parameters
  // Since IDiscussionBoardSystemSetting.ICreate is empty, pass empty object
  await TestValidator.error("duplicate key error", async () => {
    await generate_random_discussion_board_administrator_system_settings_create(
      adminConnection,
      {},
    );
  });
}
