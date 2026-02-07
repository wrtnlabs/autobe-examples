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
 * Test filtering comment rate limits by specific endpoint paths.
 *
 * This test validates that administrators can search for rate limits targeting
 * particular API endpoints using various filter combinations including endpoint
 * path partial matching, HTTP method filtering, and active status filtering.
 */
export async function test_api_admin_comment_rate_limits_filter_by_endpoint(
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
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Filter by endpoint path with partial matching
  const commentPathResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "/comments",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(commentPathResults);
  // Test 2: Filter by specific HTTP method
  const postMethodResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      {
        body: {
          http_method: "POST",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(postMethodResults);
  // Test 3: Filter by active status
  const activeResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(activeResults);
  // Test 4: Combined filter - comment endpoints that are active
  const combinedResults =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "/comments",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    combinedResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(combinedResults.data),
  );
  TestValidator.equals(
    "pagination current page",
    combinedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    combinedResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    combinedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    combinedResults.pagination.pages >= 0,
  );
  // Validate that filtered results match the criteria
  if (combinedResults.data.length > 0) {
    for (const rateLimit of combinedResults.data) {
      TestValidator.predicate(
        "endpoint path contains filter term",
        rateLimit.endpoint_path.includes("/comments"),
      );
      TestValidator.predicate(
        "is active matches filter",
        rateLimit.is_active === true,
      );
    }
  }
  // Validate rate limit structure for items in the results
  if (combinedResults.data.length > 0) {
    const sampleRateLimit = combinedResults.data[0];
    TestValidator.predicate("has id", sampleRateLimit.id !== undefined);
    TestValidator.predicate(
      "has endpoint_path",
      sampleRateLimit.endpoint_path !== undefined,
    );
    TestValidator.predicate(
      "has http_method",
      sampleRateLimit.http_method !== undefined,
    );
    TestValidator.predicate(
      "has rate_limit_type",
      sampleRateLimit.rate_limit_type !== undefined,
    );
    TestValidator.predicate(
      "has requests_per_interval",
      sampleRateLimit.requests_per_interval !== undefined,
    );
    TestValidator.predicate(
      "has interval_seconds",
      sampleRateLimit.interval_seconds !== undefined,
    );
    TestValidator.predicate(
      "has enforcement_action",
      sampleRateLimit.enforcement_action !== undefined,
    );
    TestValidator.predicate(
      "has is_active",
      typeof sampleRateLimit.is_active === "boolean",
    );
    TestValidator.predicate(
      "has enforcement_count",
      sampleRateLimit.enforcement_count !== undefined,
    );
  }
}
