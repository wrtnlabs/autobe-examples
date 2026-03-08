import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_session_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate admin user using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Admin user is now authenticated to adminConnection
  // Test 1: Pagination with default values
  const result1 =
    await api.functional.discussionBoard.admin.analytics.sessions.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result1);
  // Validate pagination structure
  TestValidator.equals("pagination exists", result1.pagination, {
    current: 1,
    limit: 20,
    records: result1.pagination.records,
    pages: result1.pagination.pages,
  });
  TestValidator.predicate("data array exists", Array.isArray(result1.data));
  // Test 2: Pagination with custom page and limit
  const result2 =
    await api.functional.discussionBoard.admin.analytics.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result2);
  TestValidator.equals("custom pagination page", result2.pagination.current, 1);
  TestValidator.equals("custom pagination limit", result2.pagination.limit, 10);
  // Test 3: Last page calculation
  if (result2.pagination.pages > 0) {
    const lastPageResult =
      await api.functional.discussionBoard.admin.analytics.sessions.index(
        adminConnection,
        {
          body: {
            page: result2.pagination.pages,
            limit: 10,
          },
        },
      );
    typia.assert(lastPageResult);
    TestValidator.equals(
      "last page number",
      lastPageResult.pagination.current,
      result2.pagination.pages,
    );
  }
  // Test 4: Out of bounds page
  if (result2.pagination.pages > 0) {
    const outOfBoundsResult =
      await api.functional.discussionBoard.admin.analytics.sessions.index(
        adminConnection,
        {
          body: {
            page: result2.pagination.pages + 10,
            limit: 10,
          },
        },
      );
    typia.assert(outOfBoundsResult);
    TestValidator.equals(
      "out of bounds page",
      outOfBoundsResult.data.length,
      0,
    );
  }
  // Test 5: Minimum limit (1)
  const minLimitResult =
    await api.functional.discussionBoard.admin.analytics.sessions.index(
      adminConnection,
      {
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals("minimum limit", minLimitResult.pagination.limit, 1);
  // Test 6: Maximum limit (100)
  const maxLimitResult =
    await api.functional.discussionBoard.admin.analytics.sessions.index(
      adminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals("maximum limit", maxLimitResult.pagination.limit, 100);
  // Test 7: Total records consistency
  const page1Result =
    await api.functional.discussionBoard.admin.analytics.sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  const page2Result =
    await api.functional.discussionBoard.admin.analytics.sessions.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page1Result);
  typia.assert(page2Result);
  TestValidator.equals(
    "total records consistent",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
}
