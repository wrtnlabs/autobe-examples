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
 * Test the ability of moderators to retrieve a paginated list of guest
 * visitors.
 *
 * This test validates that moderators can successfully authenticate and then
 * retrieve guest records with proper pagination controls. The test verifies
 * that the response includes pagination metadata (current page, limit, total
 * records, total pages) and a data array containing guest summaries.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve guest list with default pagination parameters
 * 3. Validate pagination metadata structure and values
 * 4. Validate guest data array structure
 * 5. Test with specific pagination parameters (page number and limit)
 * 6. Verify pagination calculations are correct
 */
export async function test_api_guest_list_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Verify moderator authentication tokens are present
  TestValidator.predicate(
    "moderator has access token",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "moderator has refresh token",
    moderator.token.refresh.length > 0,
  );

  // Step 2: Retrieve guest list with default pagination
  const defaultRequest = {} satisfies IRedditCommunityGuest.IRequest;

  const defaultResponse: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);

  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    defaultResponse.pagination !== null &&
      defaultResponse.pagination !== undefined,
  );

  const pagination: IPage.IPagination = defaultResponse.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);

  // Step 4: Validate guest data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResponse.data),
  );

  // If there are guests, validate their structure
  if (defaultResponse.data.length > 0) {
    const firstGuest = defaultResponse.data[0];
    typia.assert<IRedditCommunityGuest.ISummary>(firstGuest);
    // typia.assert() already validates all type aspects including UUID format
    // No additional validation needed
  }

  // Step 5: Test with specific pagination parameters
  const specificRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityGuest.IRequest;

  const specificResponse: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: specificRequest,
    });
  typia.assert(specificResponse);

  // Step 6: Verify pagination parameters are respected
  TestValidator.equals(
    "limit matches request",
    specificResponse.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "data array respects limit",
    specificResponse.data.length <= 10,
  );

  // Test with different page and limit values
  const customRequest = {
    page: 1,
    limit: 5,
  } satisfies IRedditCommunityGuest.IRequest;

  const customResponse: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: customRequest,
    });
  typia.assert(customResponse);

  TestValidator.equals(
    "custom limit matches request",
    customResponse.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "custom data array respects limit",
    customResponse.data.length <= 5,
  );

  // Validate pagination calculation: pages = ceil(records / limit)
  if (customResponse.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      customResponse.pagination.records / customResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      customResponse.pagination.pages,
      expectedPages,
    );
  }
}
