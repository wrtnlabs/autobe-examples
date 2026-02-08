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

export async function test_api_system_settings_pagination_empty_page(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join and authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Call systemSettings index API with empty request body
  const response =
    await api.functional.discussionBoard.administrator.systemSettings.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate("current page non-negative", pagination.current >= 0);
  TestValidator.predicate("limit non-negative", pagination.limit >= 0);
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  TestValidator.predicate("pages non-negative", pagination.pages >= 0);
  // Validate empty data array for no content
  TestValidator.equals("data array empty", response.data.length, 0);
  // Validate that unauthorized access is forbidden
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.administrator.systemSettings.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
