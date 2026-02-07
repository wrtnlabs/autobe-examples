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
 * Test the basic search functionality for comment rate limits without any filters applied.
 * This scenario validates that administrators can retrieve a paginated list of all active
 * rate limit configurations for general platform monitoring.
 */
export async function test_api_admin_comment_rate_limits_search_all_active(
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
  // Search for all active rate limits with default pagination
  const searchResult =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1 satisfies number as number,
          limit: 20 satisfies number as number,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination business logic
  TestValidator.predicate(
    "current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate pagination calculation
  if (searchResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      searchResult.pagination.records / searchResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      searchResult.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "empty records has zero pages",
      searchResult.pagination.pages,
      0,
    );
  }
  // Validate rate limit summaries business logic (only if data exists)
  if (searchResult.data.length > 0) {
    const rateLimit = searchResult.data[0];
    // Business logic validation - not type checking
    TestValidator.predicate(
      "requests per interval is positive",
      rateLimit.requests_per_interval > 0,
    );
    TestValidator.predicate(
      "interval seconds is positive",
      rateLimit.interval_seconds > 0,
    );
    TestValidator.predicate(
      "enforcement count is non-negative",
      rateLimit.enforcement_count >= 0,
    );
    // Validate that active rate limits have valid configuration
    if (rateLimit.is_active) {
      TestValidator.predicate(
        "active rate limit has endpoint path",
        rateLimit.endpoint_path.length > 0,
      );
      TestValidator.predicate(
        "active rate limit has http method",
        rateLimit.http_method.length > 0,
      );
    }
  }
}
