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
 * Test pagination functionality for moderator activity history retrieval.
 *
 * This test validates that the moderator activity endpoint correctly handles
 * pagination parameters and returns accurate pagination metadata. It creates a
 * moderator account and then requests activity history with various page and
 * limit parameters to verify proper pagination behavior.
 *
 * Steps:
 *
 * 1. Create a new moderator account for testing
 * 2. Request first page of activity with default limit
 * 3. Validate pagination metadata structure and values
 * 4. Request different pages with various limit values
 * 5. Verify pagination calculations are correct
 * 6. Test edge cases like requesting beyond available pages
 */
export async function test_api_moderator_activity_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Request first page with default pagination
  const firstPageRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const firstPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    firstPage.pagination !== null && firstPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    firstPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    firstPage.pagination.current >= 0,
  );

  // Step 4: Request with different limit value
  const smallLimitRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const smallLimitPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: smallLimitRequest,
      },
    );
  typia.assert(smallLimitPage);

  TestValidator.equals(
    "small limit pagination limit is correct",
    smallLimitPage.pagination.limit,
    10,
  );

  // Step 5: Request with maximum limit
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const maxLimitPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: maxLimitRequest,
      },
    );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "max limit pagination limit is correct",
    maxLimitPage.pagination.limit,
    100,
  );

  // Step 6: Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(firstPage.data));
  TestValidator.predicate(
    "data array length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );

  // Step 7: Test requesting page 2
  const secondPageRequest = {
    page: 2,
    limit: 20,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const secondPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);

  // Step 8: Validate pagination consistency across requests
  TestValidator.equals(
    "total records consistent across pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent across requests",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );

  // Step 9: Request page beyond available range
  const beyondPageRequest = {
    page: 999,
    limit: 20,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const beyondPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: beyondPageRequest,
      },
    );
  typia.assert(beyondPage);

  TestValidator.predicate(
    "beyond page returns valid data array",
    Array.isArray(beyondPage.data),
  );

  // Step 10: Verify pagination metadata relationships
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculation is correct",
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    );
  }
}
