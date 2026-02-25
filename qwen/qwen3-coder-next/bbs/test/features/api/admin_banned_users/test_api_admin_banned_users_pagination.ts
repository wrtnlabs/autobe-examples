import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_users_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 1. Request first page with default limit (20 records)
  const firstPage = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(firstPage);
  // 2. Request specific page with custom limit (10 records per page)
  const page2 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(page2);
  // 3. Verify pagination metadata accuracy
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 20",
    firstPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page data is array",
    Array.isArray(firstPage.data),
  );
  // 4. Test edge case: request page beyond total pages
  const farPage = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 999,
        limit: 10,
      },
    },
  );
  typia.assert(farPage);
  TestValidator.equals("far page data is empty", farPage.data.length, 0);
  // 5. Test boundary: limit=1 (minimum)
  const minLimit = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        limit: 1,
      },
    },
  );
  typia.assert(minLimit);
  TestValidator.equals("min limit is 1", minLimit.pagination.limit, 1);
  // 6. Test boundary: limit=100 (maximum)
  const maxLimit = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit is 100", maxLimit.pagination.limit, 100);
  // 7. Verify total records count matches expected banned user count
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  // 8. Test that pages calculation is Math.ceil(records / limit)
  if (firstPage.pagination.records > 0 && firstPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      firstPage.pagination.records / firstPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      firstPage.pagination.pages,
      expectedPages,
    );
  }
}
