import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_data_retention_policies_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test pagination with different configurations
  const testCases = [
    { page: 1, limit: 10 },
    { page: 2, limit: 5 },
    { page: 1, limit: 20 },
    { page: 3, limit: 3 },
  ] as const;
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.admin.data_retention_policies.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${testCase.page} limit ${testCase.limit} - current page`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `page ${testCase.page} limit ${testCase.limit} - limit`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - total records non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - total pages non-negative`,
      response.pagination.pages >= 0,
    );
    // Validate pagination calculations
    const expectedPages = Math.ceil(
      response.pagination.records / testCase.limit,
    );
    TestValidator.equals(
      `page ${testCase.page} limit ${testCase.limit} - total pages calculation`,
      response.pagination.pages,
      expectedPages,
    );
    // Validate data array size
    TestValidator.predicate(
      `page ${testCase.page} limit ${testCase.limit} - data size within limit`,
      response.data.length <= testCase.limit,
    );
    // Validate data consistency
    if (response.data.length > 0) {
      for (const policy of response.data) {
        typia.assert(policy);
      }
    }
  }
  // Test edge case: page beyond total pages
  const largePageResponse =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(largePageResponse);
  // Page beyond total should return empty data array
  if (
    largePageResponse.pagination.current > largePageResponse.pagination.pages
  ) {
    TestValidator.equals(
      "page beyond total pages - empty data",
      largePageResponse.data.length,
      0,
    );
  }
  // Test with default parameters (no page/limit specified)
  const defaultResponse =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Default should use page=1 and limit=20
  TestValidator.equals(
    "default parameters - page 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default parameters - limit 20",
    defaultResponse.pagination.limit,
    20,
  );
}
