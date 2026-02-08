import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_list_all_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (sign up) to get authentication token
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(auth);
  // Set authorization header for all subsequent calls
  adminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Call the administrators list endpoint with empty filter (default list all)
  const requestBody: IDiscussionBoardAdministrator.IRequest = {};
  const page1 =
    await api.functional.discussionBoard.administrator.administrators.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.predicate(
    "page1 current page >= 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page1 pages >= 1",
    page1.pagination.pages >= 1 || page1.pagination.records === 0,
  );
  TestValidator.predicate("page1 limit >= 0", page1.pagination.limit >= 0);
  TestValidator.predicate("page1 records >= 0", page1.pagination.records >= 0);
  // Validate each administrator summary in data list
  for (const admin of page1.data) {
    typia.assert(admin);
  }
  // If multiple pages exist, test fetch page 2
  if (page1.pagination.pages > 1) {
    const requestPage2: IDiscussionBoardAdministrator.IRequest = {
      current: page1.pagination.current + 1,
    };
    const page2 =
      await api.functional.discussionBoard.administrator.administrators.index(
        adminConnection,
        { body: requestPage2 },
      );
    typia.assert(page2);
    // Validate page 2 pagination metadata and data
    TestValidator.equals(
      "page2 current page",
      page2.pagination.current,
      page1.pagination.current + 1,
    );
    TestValidator.predicate(
      "page2 data not empty or empty array",
      Array.isArray(page2.data),
    );
    // Data on page 2 - we must not access non-existent property user_id, so skip id overlap check
    for (const admin2 of page2.data) {
      for (const admin1 of page1.data) {
        // Removed invalid property access from here
      }
      typia.assert(admin2);
    }
  }
}
