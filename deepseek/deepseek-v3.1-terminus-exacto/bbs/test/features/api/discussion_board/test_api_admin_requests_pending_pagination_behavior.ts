import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_requests_pending_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test pagination with different limit values
  const limitValues = [1, 5, 10, 50, 100] as const;
  for (const limit of limitValues) {
    const page1Result =
      await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
        superAdminConnection,
        {
          body: {
            status: "pending",
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardAdminRequest.IRequest,
        },
      );
    typia.assert(page1Result);
    // Validate pagination metadata
    TestValidator.equals(
      `page 1 limit ${limit} current page`,
      page1Result.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 limit ${limit} limit`,
      page1Result.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} records non-negative`,
      page1Result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} pages non-negative`,
      page1Result.pagination.pages >= 0,
    );
    // Validate pages calculation
    const expectedPages =
      page1Result.pagination.records === 0
        ? 0
        : Math.ceil(page1Result.pagination.records / limit);
    TestValidator.equals(
      `page 1 limit ${limit} pages calculation`,
      page1Result.pagination.pages,
      expectedPages,
    );
  }
  // Test boundary conditions
  const boundaryTest =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 0, // Should default to page 1
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(boundaryTest);
  TestValidator.equals(
    "page 0 defaults to page 1",
    boundaryTest.pagination.current,
    1,
  );
  // Test page beyond total pages
  const largePageResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 999999, // Very large page number
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(largePageResult);
  // Should return empty data array when page is beyond total pages
  TestValidator.equals(
    "large page returns empty data",
    largePageResult.data.length,
    0,
  );
  if (largePageResult.pagination.pages > 0) {
    TestValidator.predicate(
      "large page current should be within bounds",
      largePageResult.pagination.current <= largePageResult.pagination.pages,
    );
  }
  // Test ordering consistency (newest first) - only if we have data
  const page1Ordered =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(page1Ordered);
  if (page1Ordered.data.length > 1) {
    for (let i = 0; i < page1Ordered.data.length - 1; i++) {
      const currentTime = new Date(page1Ordered.data[i].created_at).getTime();
      const nextTime = new Date(page1Ordered.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `page 1 ordering newest first at index ${i}`,
        currentTime >= nextTime,
      );
    }
  }
  // Only test page 2 if page 1 has data and there might be more pages
  if (page1Ordered.pagination.pages > 1) {
    const page2Ordered =
      await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
        superAdminConnection,
        {
          body: {
            status: "pending",
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardAdminRequest.IRequest,
        },
      );
    typia.assert(page2Ordered);
    if (page2Ordered.data.length > 1) {
      for (let i = 0; i < page2Ordered.data.length - 1; i++) {
        const currentTime = new Date(page2Ordered.data[i].created_at).getTime();
        const nextTime = new Date(
          page2Ordered.data[i + 1].created_at,
        ).getTime();
        TestValidator.predicate(
          `page 2 ordering newest first at index ${i}`,
          currentTime >= nextTime,
        );
      }
    }
  }
  // Test empty result set
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          search:
            "nonexistent_search_term_that_should_return_empty_" +
            RandomGenerator.alphaNumeric(10),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages count",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page",
    emptyResult.pagination.current,
    1,
  );
}
