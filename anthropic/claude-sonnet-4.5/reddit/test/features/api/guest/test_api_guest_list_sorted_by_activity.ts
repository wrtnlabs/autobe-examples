import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test sorting guest visitors by last activity timestamp in both ascending and
 * descending order.
 *
 * This test verifies that moderators can organize guest data by activity
 * recency to identify currently active visitors or analyze engagement patterns.
 * The test authenticates as a moderator, then retrieves guest lists with
 * sort_by set to 'last_active_at' and order set to both 'asc' and 'desc' in
 * separate requests.
 *
 * Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve guest list sorted by last_active_at in ascending order
 * 3. Validate the response structure and pagination
 * 4. Retrieve guest list sorted by last_active_at in descending order
 * 5. Validate the response structure and pagination
 * 6. Verify that both sort orders return valid data
 */
export async function test_api_guest_list_sorted_by_activity(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve guest list sorted by last_active_at in ascending order
  const ascendingResult: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: {
        sort_by: "last_active_at",
        order: "asc",
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityGuest.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 3: Validate ascending order response structure
  TestValidator.predicate(
    "ascending result has valid pagination",
    ascendingResult.pagination.current >= 0 &&
      ascendingResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "ascending result data is array",
    Array.isArray(ascendingResult.data),
  );

  // Step 4: Retrieve guest list sorted by last_active_at in descending order
  const descendingResult: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: {
        sort_by: "last_active_at",
        order: "desc",
        page: 1,
        limit: 50,
      } satisfies IRedditCommunityGuest.IRequest,
    });
  typia.assert(descendingResult);

  // Step 5: Validate descending order response structure
  TestValidator.predicate(
    "descending result has valid pagination",
    descendingResult.pagination.current >= 0 &&
      descendingResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "descending result data is array",
    Array.isArray(descendingResult.data),
  );

  // Step 6: Verify both requests succeeded and returned consistent structure
  TestValidator.predicate(
    "both results have same pagination limit",
    ascendingResult.pagination.limit === descendingResult.pagination.limit,
  );

  TestValidator.predicate(
    "ascending result pagination current is 0 for page 1",
    ascendingResult.pagination.current === 0,
  );

  TestValidator.predicate(
    "descending result pagination current is 0 for page 1",
    descendingResult.pagination.current === 0,
  );
}
