import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_messages_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Call system messages index endpoint with empty body
  const output =
    await api.functional.discussionBoard.administrator.systemMessages.index(
      adminConnection,
      { body: {} },
    );
  // 3. Validate response type
  typia.assert(output);
  // 4. Validate pagination fields
  const { pagination, data } = output;
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pagination.pages >= 0,
  );
  // 5. Validate pages count match records and limit
  TestValidator.equals(
    "pagination pages count math",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Validate data array length does not exceed limit
  TestValidator.predicate(
    "data array length within limit",
    data.length <= pagination.limit,
  );
  // 7. Validate each data item
  for (const item of data) typia.assert(item);
  // 8. Validate authorization enforcement: unauthorized call returns error
  const failedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    // call without authorization should fail
    await api.functional.discussionBoard.administrator.systemMessages.index(
      failedConnection,
      { body: {} },
    );
  });
}
