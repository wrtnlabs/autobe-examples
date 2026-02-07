import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test pagination functionality of the API rate limits search endpoint.
 * Verify that pagination parameters (page, limit) work correctly by testing
 * different page sizes and page numbers. Test edge cases like requesting
 * page 1 with limit 10, page 2 with limit 5, and exceeding the maximum
 * limit of 100. Validate that the pagination metadata in the response
 * accurately reflects the current page, total records, and page count.
 * Ensure that empty pages return appropriate empty data arrays with correct
 * pagination info.
 */
export async function test_api_superadmin_api_rate_limits_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Default pagination (page 1, limit 20)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Test 2: Page 1 with limit 10 (as specified in scenario)
  const page1Limit10Response =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(page1Limit10Response);
  TestValidator.equals(
    "page 1 with limit 10 should have correct page",
    page1Limit10Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 10 should have correct limit",
    page1Limit10Response.pagination.limit,
    10,
  );
  // Test 3: Page 2 with limit 5 (as specified in scenario)
  const page2Limit5Response =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(page2Limit5Response);
  TestValidator.equals(
    "page 2 should be current",
    page2Limit5Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit 5 should be set",
    page2Limit5Response.pagination.limit,
    5,
  );
  // Test 4: Maximum limit (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 5: Minimum limit (1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );
  // Test 6: Empty page (very high page number)
  const emptyPageResponse =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty page should have empty data array",
    emptyPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty page current should match request",
    emptyPageResponse.pagination.current,
    999999,
  );
  // Test 7: Pagination consistency
  TestValidator.predicate(
    "pages calculation should be consistent",
    defaultResponse.pagination.pages ===
      Math.ceil(
        defaultResponse.pagination.records / defaultResponse.pagination.limit,
      ),
  );
  // Test 8: Data length should not exceed limit
  TestValidator.predicate(
    "data length should not exceed limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  // Test 9: Validate pagination metadata consistency across requests
  TestValidator.equals(
    "total records should be consistent across pagination requests",
    defaultResponse.pagination.records,
    page1Limit10Response.pagination.records,
  );
  TestValidator.equals(
    "total pages calculation should be consistent",
    defaultResponse.pagination.pages,
    page1Limit10Response.pagination.pages,
  );
}
