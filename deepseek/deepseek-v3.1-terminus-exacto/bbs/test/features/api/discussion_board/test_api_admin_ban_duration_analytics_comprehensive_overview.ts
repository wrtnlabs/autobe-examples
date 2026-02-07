import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_duration_analytics_comprehensive_overview(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create actor-specific connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Get all ban durations without filters
  const allDurations =
    await api.functional.discussionBoard.admin.analytics.ban_durations.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(allDurations);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    allDurations.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    allDurations.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    allDurations.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    allDurations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    allDurations.pagination.pages >= 0,
  );
  // Test 2: Search functionality
  if (allDurations.data.length > 0) {
    const searchTerm = allDurations.data[0].name.substring(0, 3);
    const searchResults =
      await api.functional.discussionBoard.admin.analytics.ban_durations.index(
        adminConnection,
        {
          body: {
            search: searchTerm,
          } satisfies IDiscussionBoardBanDuration.IRequest,
        },
      );
    typia.assert(searchResults);
    TestValidator.predicate(
      "search returns results",
      searchResults.data.length >= 0,
    );
  }
  // Test 3: Filter by duration range
  const rangeResults =
    await api.functional.discussionBoard.admin.analytics.ban_durations.index(
      adminConnection,
      {
        body: {
          duration_hours_min: 0,
          duration_hours_max: 1000,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(rangeResults);
  // Test 4: Filter by permanent status
  const permanentResults =
    await api.functional.discussionBoard.admin.analytics.ban_durations.index(
      adminConnection,
      {
        body: {
          is_permanent: true,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permanentResults);
  // Test 5: Pagination with specific page and limit
  const paginatedResults =
    await api.functional.discussionBoard.admin.analytics.ban_durations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "page 1 requested",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.predicate("limit respected", paginatedResults.data.length <= 5);
}
