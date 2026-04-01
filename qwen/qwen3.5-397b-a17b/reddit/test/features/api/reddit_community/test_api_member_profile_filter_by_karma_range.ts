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
 * Test karma score range filtering functionality for member profiles.
 *
 * Tests the karmaMin and karmaMax filter parameters to discover users within
 * specific karma ranges. Validates filtering behavior with pagination and
 * ensures pagination metadata accurately reflects filtered record count.
 *
 * Test scenarios:
 * 1. Filter with karmaMin only - returns profiles with karma >= minimum value
 * 2. Filter with karmaMax only - returns profiles with karma <= maximum value
 * 3. Filter with both karmaMin and karmaMax - returns profiles within the range
 * 4. Filter with karmaMin exceeding all user karma - returns empty results
 * 5. Filter with karmaMin equal to karmaMax - returns profiles with exact karma value
 */
export async function test_api_member_profile_filter_by_karma_range(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Filter with karmaMin only
  const karmaMinOnly: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMin: 0,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaMinOnly);
  // Validate all returned profiles have karma >= 0
  for (const profile of karmaMinOnly.data) {
    TestValidator.predicate(
      `karmaMin filter: profile ${profile.username} has karma >= 0`,
      profile.karma_score >= 0,
    );
  }
  TestValidator.predicate(
    "karmaMin only pagination records count",
    karmaMinOnly.pagination.records >= karmaMinOnly.data.length,
  );
  // Scenario 2: Filter with karmaMax only
  const karmaMaxOnly: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMax: 1000,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaMaxOnly);
  // Validate all returned profiles have karma <= 1000
  for (const profile of karmaMaxOnly.data) {
    TestValidator.predicate(
      `karmaMax filter: profile ${profile.username} has karma <= 1000`,
      profile.karma_score <= 1000,
    );
  }
  TestValidator.predicate(
    "karmaMax only pagination records count",
    karmaMaxOnly.pagination.records >= karmaMaxOnly.data.length,
  );
  // Scenario 3: Filter with both karmaMin and karmaMax (range filter)
  const karmaRange: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMin: 100,
        karmaMax: 500,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaRange);
  // Validate all returned profiles have karma in range [100, 500]
  for (const profile of karmaRange.data) {
    TestValidator.predicate(
      `karma range filter: profile ${profile.username} has karma in [100, 500]`,
      profile.karma_score >= 100 && profile.karma_score <= 500,
    );
  }
  TestValidator.predicate(
    "karma range pagination records count",
    karmaRange.pagination.records >= karmaRange.data.length,
  );
  // Scenario 4: Filter with karmaMin exceeding all user karma (empty results)
  const karmaMinHigh: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMin: 100000,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaMinHigh);
  // Should return empty data array
  TestValidator.equals(
    "karmaMin exceeding all karma returns empty data",
    karmaMinHigh.data.length,
    0,
  );
  TestValidator.equals(
    "karmaMin high pagination records count",
    karmaMinHigh.pagination.records,
    0,
  );
  TestValidator.equals(
    "karmaMin high pagination pages count",
    karmaMinHigh.pagination.pages,
    0,
  );
  // Scenario 5: Filter with karmaMin equal to karmaMax (exact match)
  const karmaExact: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMin: 0,
        karmaMax: 0,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaExact);
  // Validate all returned profiles have karma exactly 0
  for (const profile of karmaExact.data) {
    TestValidator.equals(
      `karma exact filter: profile ${profile.username} has karma = 0`,
      profile.karma_score,
      0,
    );
  }
  TestValidator.predicate(
    "karma exact pagination records count",
    karmaExact.pagination.records >= karmaExact.data.length,
  );
  // Scenario 6: Test pagination with karma filter
  const karmaPaginated: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: {
        karmaMin: 0,
        karmaMax: 1000,
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityUserProfile.IRequest,
    });
  typia.assert(karmaPaginated);
  // Validate pagination metadata
  TestValidator.equals(
    "paginated karma filter current page",
    karmaPaginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated karma filter limit",
    karmaPaginated.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "paginated karma filter data length matches limit or records",
    karmaPaginated.data.length <= karmaPaginated.pagination.limit &&
      karmaPaginated.data.length <= karmaPaginated.pagination.records,
  );
}
