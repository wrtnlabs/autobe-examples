import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the pagination functionality of the moderation efficiency analytics endpoint.
 * Verifies proper handling of pagination parameters, accurate metadata, and edge cases.
 */
export async function test_api_moderation_efficiency_pagination_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic pagination with page 1 and limit 10
  const response1 =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current page", response1.pagination.current, 1);
  TestValidator.equals("page 1 limit", response1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    response1.pagination.pages >= 0,
  );
  // Test 2: Different page and limit combination
  const response2 =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          page: 2 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("page 2 current page", response2.pagination.current, 2);
  TestValidator.equals("page 2 limit", response2.pagination.limit, 5);
  // Test 3: Maximum limit test
  const response3 =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 100 satisfies number as number,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("max limit test", response3.pagination.limit, 100);
  // Test 4: Empty result set with specific filters
  const response4 =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          registration_date_start: new Date(
            "3000-01-01T00:00:00.000Z",
          ).toISOString(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "empty result set records",
    response4.pagination.records,
    0,
  );
  TestValidator.equals("empty result set pages", response4.pagination.pages, 0);
  TestValidator.equals(
    "empty result set data length",
    response4.data.length,
    0,
  );
  // Test 5: Verify consistency across pages when there are multiple pages
  if (response1.pagination.pages > 1) {
    const lastPageResponse =
      await api.functional.discussionBoard.superAdmin.analytics.moderation_efficiency.index(
        superAdminConnection,
        {
          body: {
            page: response1.pagination.pages satisfies number as number,
            limit: response1.pagination.limit satisfies number as number,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page current page",
      lastPageResponse.pagination.current,
      response1.pagination.pages,
    );
    TestValidator.equals(
      "consistent total records",
      lastPageResponse.pagination.records,
      response1.pagination.records,
    );
  }
  // Test 6: Data structure consistency
  if (response1.data.length > 0) {
    const firstItem = response1.data[0];
    typia.assert(firstItem);
    // Validate that the data structure follows IDiscussionBoardPerformanceMetric.ISummary
    TestValidator.predicate(
      "data structure is object",
      typeof firstItem === "object",
    );
  }
}
