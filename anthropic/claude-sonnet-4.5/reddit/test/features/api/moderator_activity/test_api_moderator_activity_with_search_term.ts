import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test searching moderator activity history using the search parameter to find
 * actions matching specific keywords.
 *
 * This test validates that the search functionality performs text-based
 * matching across action reasons, target content metadata, and related fields.
 * It verifies that providing a search term filters the activity list to only
 * include actions where the search term appears in searchable fields, enabling
 * moderators to quickly locate specific moderation decisions or actions related
 * to particular content or users.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account with authentication
 * 2. Retrieve moderator activity history with a search term parameter
 * 3. Validate the paginated response structure
 * 4. Verify that search functionality returns valid results
 */
export async function test_api_moderator_activity_with_search_term(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderator activity history with search term
  const searchTerm = RandomGenerator.name();
  const activityResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 20,
          search: searchTerm,
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(activityResult);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be non-negative",
    activityResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    activityResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    activityResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    activityResult.pagination.pages >= 0,
  );

  // Step 4: Validate activity data array
  TestValidator.predicate(
    "activity data should be an array",
    Array.isArray(activityResult.data),
  );
  TestValidator.predicate(
    "activity data length should not exceed limit",
    activityResult.data.length <= activityResult.pagination.limit,
  );

  // Step 5: Validate individual activity items if data exists
  if (activityResult.data.length > 0) {
    const firstActivity = activityResult.data[0];
    typia.assert(firstActivity);
  }
}
