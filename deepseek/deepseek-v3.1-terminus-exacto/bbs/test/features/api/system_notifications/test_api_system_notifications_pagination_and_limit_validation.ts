import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_notifications_pagination_and_limit_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Test pagination with different limit values (1-100)
  const limitTestCases = [1, 5, 10, 25, 50, 100] as const;
  for (const limit of limitTestCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.system_notifications.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardSystemNotification.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} - current page`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} - limit value`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - records non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} - pages non-negative`,
      response.pagination.pages >= 0,
    );
    // Validate pagination calculations
    if (response.pagination.records > 0) {
      const expectedPages = Math.ceil(
        response.pagination.records / response.pagination.limit,
      );
      TestValidator.equals(
        `limit ${limit} - pages calculation`,
        response.pagination.pages,
        expectedPages,
      );
    }
    // Validate data array length does not exceed limit
    TestValidator.predicate(
      `limit ${limit} - data length <= limit`,
      response.data.length <= limit,
    );
  }
  // 3. Test pagination with different page numbers
  const firstPageResponse =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  if (firstPageResponse.pagination.pages > 1) {
    // Test second page
    const secondPageResponse =
      await api.functional.discussionBoard.superAdmin.system_notifications.index(
        superAdminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardSystemNotification.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "second page - current page",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "page 1 and page 2 data differ",
      firstPageResponse.data,
      secondPageResponse.data,
    );
    // Test page beyond total pages (should return last page or empty)
    const beyondPageResponse =
      await api.functional.discussionBoard.superAdmin.system_notifications.index(
        superAdminConnection,
        {
          body: {
            page: firstPageResponse.pagination.pages + 1,
            limit: 10,
          } satisfies IDiscussionBoardSystemNotification.IRequest,
        },
      );
    typia.assert(beyondPageResponse);
    // Should either return empty data or the last page's data
    TestValidator.predicate(
      "beyond last page - valid response",
      beyondPageResponse.data.length === 0 ||
        beyondPageResponse.pagination.current ===
          firstPageResponse.pagination.pages,
    );
  }
  // 4. Test empty result set with search query that matches nothing
  const emptyResponse =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          search:
            "nonexistent_search_query_that_will_return_empty_results_" +
            RandomGenerator.alphaNumeric(10),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty search - records count",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search - pages count",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search - data array empty",
    emptyResponse.data.length,
    0,
  );
  // 5. Test limit boundary validation
  // Test minimum limit (1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals("minimum limit", minLimitResponse.pagination.limit, 1);
  // Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals("maximum limit", maxLimitResponse.pagination.limit, 100);
  // 6. Test pagination metadata consistency
  const consistencyResponse =
    await api.functional.discussionBoard.superAdmin.system_notifications.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemNotification.IRequest,
      },
    );
  typia.assert(consistencyResponse);
  // Validate that pagination metadata is internally consistent
  if (consistencyResponse.pagination.records > 0) {
    TestValidator.predicate(
      "pagination consistency - data length reasonable",
      consistencyResponse.data.length <= consistencyResponse.pagination.limit,
    );
    TestValidator.predicate(
      "pagination consistency - pages calculation",
      consistencyResponse.pagination.pages ===
        Math.ceil(
          consistencyResponse.pagination.records /
            consistencyResponse.pagination.limit,
        ),
    );
  }
}
