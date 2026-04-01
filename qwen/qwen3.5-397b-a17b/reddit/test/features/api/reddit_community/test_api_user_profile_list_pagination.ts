import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfile";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test user profile list pagination functionality.
 *
 * This test verifies the PATCH /redditCommunity/profiles endpoint returns
 * properly paginated user profiles with correct structure and metadata.
 *
 * Test Flow:
 * 1. Call the profiles endpoint with default pagination parameters
 * 2. Validate response structure matches IPageIRedditCommunityUserProfile.ISummary
 * 3. Verify pagination metadata (current, limit, records, pages)
 * 4. Test custom pagination parameters (different page and limit)
 * 5. Verify sorting options work correctly
 * 6. Test search and karma range filtering
 */
export async function test_api_user_profile_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination (page=1, limit=20)
  const defaultRequest: IRedditCommunityUserProfile.IRequest = {
    page: 1,
    limit: 20,
  };
  const defaultResponse: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);
  // 2. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    defaultResponse.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResponse.data),
  );
  TestValidator.equals("current page", defaultResponse.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 3. Test custom pagination parameters
  const customRequest: IRedditCommunityUserProfile.IRequest = {
    page: 2,
    limit: 10,
  };
  const customResponse: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: customRequest,
    });
  typia.assert(customResponse);
  TestValidator.equals("custom page", customResponse.pagination.current, 2);
  TestValidator.equals("custom limit", customResponse.pagination.limit, 10);
  // 4. Test sorting by karma_score (descending by default)
  const sortedRequest: IRedditCommunityUserProfile.IRequest = {
    page: 1,
    limit: 5,
    sort: "karma_score",
  };
  const sortedResponse: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: sortedRequest,
    });
  typia.assert(sortedResponse);
  // Verify karma scores are in descending order (business logic validation)
  if (sortedResponse.data.length > 1) {
    for (let i = 1; i < sortedResponse.data.length; i++) {
      TestValidator.predicate(
        "karma scores descending",
        sortedResponse.data[i - 1].karma_score >=
          sortedResponse.data[i].karma_score,
      );
    }
  }
  // 5. Test search functionality
  const searchRequest: IRedditCommunityUserProfile.IRequest = {
    page: 1,
    limit: 10,
    search: "test",
  };
  const searchResponse: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResponse);
  // 6. Test karma range filtering
  const karmaFilterRequest: IRedditCommunityUserProfile.IRequest = {
    page: 1,
    limit: 10,
    karmaMin: 0,
    karmaMax: 1000,
  };
  const karmaFilterResponse: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: karmaFilterRequest,
    });
  typia.assert(karmaFilterResponse);
  // Verify all profiles match karma range (business logic validation)
  for (const profile of karmaFilterResponse.data) {
    TestValidator.predicate(
      "karma within range",
      profile.karma_score >= 0 && profile.karma_score <= 1000,
    );
  }
  // 7. Test maximum limit (100)
  const maxLimitRequest: IRedditCommunityUserProfile.IRequest = {
    page: 1,
    limit: 100,
  };
  const maxLimitResponse: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.profiles.index(connection, {
      body: maxLimitRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals("max limit", maxLimitResponse.pagination.limit, 100);
  TestValidator.predicate(
    "data count within limit",
    maxLimitResponse.data.length <= 100,
  );
}
