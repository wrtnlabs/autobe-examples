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
 * Test advanced filtering capabilities for rate limiting configurations.
 * An administrator searches using timestamp filters for records created or updated after specific dates,
 * combines multiple filter criteria (endpoint path + HTTP method + active status), and tests enforcement-related
 * filters like enforcement action types and enforcement counts. Validate that complex filter combinations
 * work correctly and that the system properly handles edge cases like empty result sets and boundary conditions
 * for timestamp filtering.
 */
export async function test_api_rate_limits_search_advanced_filters(
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
  // Test 1: Timestamp filtering - created_at_after
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const createdAfterResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          created_at_after: pastDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(createdAfterResults);
  // Test 2: Timestamp filtering - updated_at_after
  const recentDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const updatedAfterResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          updated_at_after: recentDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(updatedAfterResults);
  // Test 3: Combined filtering - endpoint path + HTTP method + active status
  const combinedResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard",
          http_method: "GET",
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Test 4: Enforcement action filtering
  const enforcementResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          enforcement_action: "block",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(enforcementResults);
  // Test 5: Rate limit type filtering
  const rateLimitTypeResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          rate_limit_type: "ip_based",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(rateLimitTypeResults);
  // Test 6: Empty result set scenario - future date filter
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const emptyResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          created_at_after: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "future date filter returns empty data array",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "future date filter returns zero records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date filter returns zero pages",
    emptyResults.pagination.pages,
    0,
  );
  // Test 7: Complex combination with pagination
  const complexResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "/discussionBoard",
          http_method: "POST",
          rate_limit_type: "user_based",
          enforcement_action: "throttle",
          is_active: true,
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(complexResults);
  // Test 8: Boundary condition - minimum page and limit values
  const boundaryResults =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(boundaryResults);
  TestValidator.equals(
    "minimum limit returns valid limit",
    boundaryResults.pagination.limit,
    1,
  );
}
