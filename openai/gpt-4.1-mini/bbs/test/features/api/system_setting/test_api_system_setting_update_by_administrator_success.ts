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

export async function test_api_system_setting_update_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication by join (create account and login)
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Generate system setting ID and update payload
  const id = "00000000-0000-4000-8000-000000000001";
  const body = typia.random<IDiscussionBoardSystemSetting.IUpdate>();
  // 3. Call update API
  const beforeUpdate = new Date().toISOString();
  const updatedSetting =
    await api.functional.discussionBoard.administrator.systemSettings.update(
      adminConnection,
      { id, body },
    );
  typia.assert(updatedSetting);
  // 4. Validate updated_at was recent (some time after beforeUpdate)
  if (
    "updated_at" in updatedSetting &&
    updatedSetting.updated_at !== null &&
    updatedSetting.updated_at !== undefined
  ) {
    const updatedAtString =
      typeof updatedSetting.updated_at === "string"
        ? updatedSetting.updated_at
        : "";
    TestValidator.predicate(
      "updated_at is recent",
      new Date(updatedAtString).getTime() >= new Date(beforeUpdate).getTime(),
    );
  }
}
