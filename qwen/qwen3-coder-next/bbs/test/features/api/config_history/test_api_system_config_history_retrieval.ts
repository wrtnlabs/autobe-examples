import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfigHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as admin to get authentication token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve configuration history list to get a valid history ID
  const historyList =
    await api.functional.discussionBoard.admin.config_history.index(
      adminConnection,
    );
  typia.assert(historyList);
  // 3. Validate history list has at least one record
  TestValidator.predicate(
    "has at least one history record",
    historyList.data.length > 0,
  );
  // 4. Generate a UUID for historyId (since IDiscussionBoardSystemConfigHistory is empty)
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve specific configuration history record
  const configHistory =
    await api.functional.discussionBoard.admin.config_history.at(
      adminConnection,
      { historyId },
    );
  typia.assert(configHistory);
}
