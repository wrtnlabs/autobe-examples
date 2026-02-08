import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_settings_retrieve_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator and login to authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update adminConnection headers with token from authorized result
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve system settings page with empty request (default pagination)
  const output =
    await api.functional.discussionBoard.administrator.systemSettings.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(output);
  // 3. Assertions for pagination metadata
  TestValidator.predicate(
    "pagination current is number and >= 1",
    typeof output.pagination.current === "number" &&
      output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is number and >= 0",
    typeof output.pagination.limit === "number" && output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is number and >= 0",
    typeof output.pagination.records === "number" &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number and >= 0",
    typeof output.pagination.pages === "number" && output.pagination.pages >= 0,
  );
  // 4. Validate that system settings items exist
  for (const setting of output.data) {
    typia.assert(setting);
    // Removed invalid property checks since 'key', 'value', 'description' do not exist on the type of 'setting'
  }
  // 5. Test unauthorized access to systemSettings.index API
  // Use a new connection with no authorization headers
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to systemSettings.index",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
}
