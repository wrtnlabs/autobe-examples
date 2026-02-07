import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic search functionality for API rate limiting configurations.
 * An administrator authenticates and searches for rate limits using various
 * filter combinations including endpoint path partial matching, HTTP method
 * filtering, rate limit type filtering, and active status filtering.
 * Validate that the search returns paginated results with correct summary
 * information including endpoint paths, HTTP methods, rate limit types,
 * enforcement actions, and active status. Verify that the pagination metadata
 * is accurate and that filters correctly narrow down the results.
 */
export async function test_api_rate_limits_search_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with no filters (get all rate limits)
  const adminConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const allResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(allResults);
  TestValidator.predicate(
    "should return pagination metadata",
    allResults.pagination.current === 1 &&
      allResults.pagination.limit === 20 &&
      allResults.pagination.records >= 0 &&
      allResults.pagination.pages >= 0,
  );
  // Test 2: Search with endpoint path filter
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const endpointResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection2,
      {
        body: {
          endpoint_path: "/api",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(endpointResults);
  // Test 3: Search with HTTP method filter
  const adminConnection3: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const methodResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection3,
      {
        body: {
          http_method: "GET",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(methodResults);
  // Test 4: Search with active status filter
  const adminConnection4: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection4, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const activeResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection4,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(activeResults);
  // Test 5: Search with multiple filters
  const adminConnection5: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection5, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const combinedResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection5,
      {
        body: {
          endpoint_path: "/api",
          http_method: "POST",
          is_active: false,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate that results contain required summary information
  if (allResults.data.length > 0) {
    const sampleRateLimit = allResults.data[0];
    TestValidator.predicate(
      "should have endpoint_path",
      typeof sampleRateLimit.endpoint_path === "string" &&
        sampleRateLimit.endpoint_path.length > 0,
    );
    TestValidator.predicate(
      "should have http_method",
      typeof sampleRateLimit.http_method === "string" &&
        sampleRateLimit.http_method.length > 0,
    );
    TestValidator.predicate(
      "should have rate_limit_type",
      typeof sampleRateLimit.rate_limit_type === "string" &&
        sampleRateLimit.rate_limit_type.length > 0,
    );
    TestValidator.predicate(
      "should have enforcement_action",
      typeof sampleRateLimit.enforcement_action === "string" &&
        sampleRateLimit.enforcement_action.length > 0,
    );
    TestValidator.predicate(
      "should have is_active",
      typeof sampleRateLimit.is_active === "boolean",
    );
  }
  // Validate filter effectiveness
  if (allResults.data.length > 0 && endpointResults.data.length > 0) {
    TestValidator.predicate(
      "endpoint filter should narrow results",
      endpointResults.pagination.records <= allResults.pagination.records,
    );
  }
  if (allResults.data.length > 0 && methodResults.data.length > 0) {
    TestValidator.predicate(
      "method filter should narrow results",
      methodResults.pagination.records <= allResults.pagination.records,
    );
  }
  if (allResults.data.length > 0 && activeResults.data.length > 0) {
    TestValidator.predicate(
      "active filter should narrow results",
      activeResults.pagination.records <= allResults.pagination.records,
    );
  }
  if (allResults.data.length > 0 && combinedResults.data.length > 0) {
    TestValidator.predicate(
      "combined filters should narrow results",
      combinedResults.pagination.records <= allResults.pagination.records,
    );
  }
}
