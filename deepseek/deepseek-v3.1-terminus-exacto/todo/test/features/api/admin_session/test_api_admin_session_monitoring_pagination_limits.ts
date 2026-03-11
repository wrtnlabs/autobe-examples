import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior for admin session monitoring with different limit values.
 *
 * 1. Create admin account and authenticate
 * 2. Test small page (limit=5)
 * 3. Test maximum limit (limit=50)
 * 4. Test boundary case (limit=1)
 * 5. Verify page parameter controls results
 * 6. Validate accurate pagination metadata
 */
export async function test_api_admin_session_monitoring_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Test small page (limit=5)
  const smallPage =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          limit: 5 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals("small limit matches", smallPage.pagination.limit, 5);
  TestValidator.equals("current page is 1", smallPage.pagination.current, 1);
  TestValidator.predicate(
    "records count is non-negative",
    smallPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    smallPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data length <= limit", smallPage.data.length <= 5);
  // 3. Test maximum limit (limit=50)
  const maxPage =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          limit: 50 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(maxPage);
  TestValidator.equals("maximum limit matches", maxPage.pagination.limit, 50);
  TestValidator.equals("max page current is 1", maxPage.pagination.current, 1);
  TestValidator.predicate("max data length <= 50", maxPage.data.length <= 50);
  // Validate consistency: total records should be same across queries
  TestValidator.equals(
    "total records consistent",
    smallPage.pagination.records,
    maxPage.pagination.records,
  );
  // 4. Test boundary case (limit=1)
  const singlePage =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {
          limit: 1 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(singlePage);
  TestValidator.equals("single limit matches", singlePage.pagination.limit, 1);
  TestValidator.equals(
    "single page current is 1",
    singlePage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "single data length <= 1",
    singlePage.data.length <= 1,
  );
  // 5. Verify page parameter controls results
  // If there are enough records, test different pages
  if (smallPage.pagination.records >= 3) {
    // Get page 2 with limit=2
    const page2 =
      await api.functional.multiUserTodo.admin.admins.sessions.index(
        adminConnection,
        {
          body: {
            limit: 2 satisfies number as number,
            page: 2 satisfies number as number,
          } satisfies IMultiUserTodoAdminSession.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
    // Get page 1 with same limit for comparison
    const page1 =
      await api.functional.multiUserTodo.admin.admins.sessions.index(
        adminConnection,
        {
          body: {
            limit: 2 satisfies number as number,
            page: 1 satisfies number as number,
          } satisfies IMultiUserTodoAdminSession.IRequest,
        },
      );
    typia.assert(page1);
    // Pages should have different data (unless total records <= limit)
    if (smallPage.pagination.records > 2) {
      TestValidator.notEquals(
        "page 1 and page 2 have different data",
        page1.data,
        page2.data,
      );
    }
  }
  // 6. Validate pagination calculations
  // Verify pages calculation: pages = Math.ceil(records / limit)
  TestValidator.equals(
    "pages calculation for small limit",
    smallPage.pagination.pages,
    Math.ceil(smallPage.pagination.records / 5),
  );
  // Ensure data length matches limit on non-final pages
  const totalRecords = smallPage.pagination.records;
  if (totalRecords > 5) {
    TestValidator.equals("full page has limit items", smallPage.data.length, 5);
  }
  // Test that limit parameters can be omitted (using defaults)
  const defaultPage =
    await api.functional.multiUserTodo.admin.admins.sessions.index(
      adminConnection,
      {
        body: {} satisfies IMultiUserTodoAdminSession.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default limit works",
    defaultPage.pagination.limit > 0,
  );
}
