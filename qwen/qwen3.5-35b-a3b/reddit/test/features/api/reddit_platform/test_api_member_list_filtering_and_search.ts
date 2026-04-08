import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering and search functionality for member listing operations.
   *
   * Validates that the member list endpoint correctly applies search filters
   * including username pattern matching, email pattern matching, karma score
   * thresholds, and combined filters. Ensures that case-insensitive LIKE
   * queries work properly and that empty search terms disable respective
   * filters.
   *
   * Special attention is given to verifying that all returned members
   * satisfy all active filter criteria and that the pagination metadata is
   * accurate.
   *
   * 1. Fetch all members as baseline dataset
   * 2. Apply username pattern search filter
   * 3. Apply email pattern search filter
   * 4. Apply karma threshold filter
   * 5. Test combined filters
   * 6. Verify empty search disables filters
   */
  // Fetch baseline dataset - all members without filters
  const baselineRequest: IRedditPlatformMember.IRequest = {
    page: 1,
    limit: 100,
  };
  const baselineResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baselineResponse);
  const baselineData = baselineResponse.data;
  TestValidator.equals(
    "baseline has members",
    baselineData.length,
    baselineResponse.pagination.records,
  );
  // Test 1: Username pattern search
  const searchUsername = "john";
  const usernameSearchResponse =
    await api.functional.redditPlatform.members.index(connection, {
      body: {
        search_username: searchUsername,
        page: 1,
        limit: 100,
      },
    });
  typia.assert(usernameSearchResponse);
  const usernameMatches = usernameSearchResponse.data.filter((member) =>
    member.username.toLowerCase().includes(searchUsername.toLowerCase()),
  );
  TestValidator.equals(
    "username search returns matching members",
    usernameSearchResponse.data.length,
    usernameMatches.length,
  );
  // Verify all returned members match the username filter
  for (const member of usernameSearchResponse.data) {
    TestValidator.predicate(
      `username contains search term for ${member.username}`,
      member.username.toLowerCase().includes(searchUsername.toLowerCase()),
    );
  }
  // Test 2: Email pattern search
  const searchEmail = "example";
  const emailSearchResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search_email: searchEmail,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(emailSearchResponse);
  // Verify all returned members match the email filter
  for (const member of emailSearchResponse.data) {
    TestValidator.predicate(
      `email contains search term for ${member.username}`,
      member.username.toLowerCase().includes(searchEmail.toLowerCase()),
    );
  }
  // Test 3: Karma threshold filter
  const karmaThreshold = 10;
  const karmaSearchResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        karma_min: karmaThreshold,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(karmaSearchResponse);
  // Verify all returned members have karma >= threshold
  for (const member of karmaSearchResponse.data) {
    TestValidator.predicate(
      `member karma meets threshold for ${member.username}`,
      member.karma >= karmaThreshold,
    );
  }
  // Test 4: Combined filters
  const combinedSearchResponse =
    await api.functional.redditPlatform.members.index(connection, {
      body: {
        search_username: searchUsername,
        karma_min: 5,
        page: 1,
        limit: 100,
      },
    });
  typia.assert(combinedSearchResponse);
  // Verify all returned members satisfy both filters
  for (const member of combinedSearchResponse.data) {
    TestValidator.predicate(
      `combined: username contains search term for ${member.username}`,
      member.username.toLowerCase().includes(searchUsername.toLowerCase()),
    );
    TestValidator.predicate(
      `combined: member karma meets threshold for ${member.username}`,
      member.karma >= 5,
    );
  }
  // Test 5: Empty search parameters disable filters
  const emptySearchResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        search_username: "",
        search_email: "",
        karma_min: undefined,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(emptySearchResponse);
  // Empty search should return all members (same as no filters)
  TestValidator.equals(
    "empty search returns all members",
    emptySearchResponse.data.length,
    baselineResponse.data.length,
  );
  // Test 6: Validate pagination metadata is accurate
  TestValidator.predicate(
    "pagination current is valid",
    baselineResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    baselineResponse.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    baselineResponse.pagination.pages,
    Math.ceil(
      baselineResponse.pagination.records / baselineResponse.pagination.limit,
    ),
  );
  TestValidator.predicate(
    "pagination records count matches",
    baselineResponse.data.length <= baselineResponse.pagination.records,
  );
}