import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_requests_list_without_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Fetch administrator requests list with no filters
  const response =
    await api.functional.discussionBoard.administrator.administratorRequests.index(
      adminConnection,
      { body: {} },
    );
  // 3. Assert response type
  typia.assert(response);
  // 4. Validate pagination info
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  // 5. Validate data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 6. For each item, assert its type (cannot validate internal fields as ISummary is empty)
  for (const item of response.data) {
    typia.assert(item);
  }
  // 7. Unauthorized user access should return 401
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administratorRequests.index(
        noAuthConnection,
        { body: {} },
      );
    },
  );
}
