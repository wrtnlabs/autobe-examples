import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: General text search - case-insensitive partial match on username OR display_name
  const searchResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        search: "test",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify all results contain 'test' in username or display_name (case-insensitive)
  for (const member of searchResult.data) {
    const hasMatch =
      member.username.toLowerCase().includes("test") ||
      member.display_name.toLowerCase().includes("test");
    TestValidator.predicate(
      `Member ${member.username} contains 'test' in username or display_name`,
      hasMatch,
    );
  }
  // Test 2: Username filter - case-insensitive partial match
  const usernameResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        username: "admin",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(usernameResult);
  for (const member of usernameResult.data) {
    TestValidator.predicate(
      `Username ${member.username} contains 'admin' (case-insensitive)`,
      member.username.toLowerCase().includes("admin"),
    );
  }
  // Test 3: Display name filter - case-insensitive partial match
  const displayNameResult =
    await api.functional.communityPlatform.members.index(connection, {
      body: {
        displayName: "user",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(displayNameResult);
  for (const member of displayNameResult.data) {
    TestValidator.predicate(
      `Display name ${member.display_name} contains 'user' (case-insensitive)`,
      member.display_name.toLowerCase().includes("user"),
    );
  }
  // Test 4: Karma range filter - inclusive bounds
  const karmaMin = 100;
  const karmaMax = 1000;
  const karmaResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        karmaMin,
        karmaMax,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(karmaResult);
  for (const member of karmaResult.data) {
    TestValidator.predicate(
      `Member ${member.username} karma ${member.karma} is within range [${karmaMin}, ${karmaMax}]`,
      member.karma >= karmaMin && member.karma <= karmaMax,
    );
  }
  // Test 5: Registration date range filter - inclusive bounds
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(dateResult);
  for (const member of dateResult.data) {
    const memberDate = new Date(member.created_at);
    TestValidator.predicate(
      `Member ${member.username} created_at ${member.created_at} is within date range`,
      memberDate >= thirtyDaysAgo && memberDate <= now,
    );
  }
  // Test 6: Combined filters with AND logic
  const combinedResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        username: "a",
        karmaMin: 50,
        karmaMax: 5000,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  for (const member of combinedResult.data) {
    TestValidator.predicate(
      `Member ${member.username} matches all combined filters`,
      member.username.toLowerCase().includes("a") &&
        member.karma >= 50 &&
        member.karma <= 5000,
    );
  }
  // Test 7: Pagination metadata reflects filtered count
  const paginatedResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "Pagination current page is 1",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit matches request",
    paginatedResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "Pagination records is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages is calculated correctly",
    paginatedResult.pagination.pages ===
      Math.ceil(
        paginatedResult.pagination.records / paginatedResult.pagination.limit,
      ),
  );
  // Test 8: Email exact match filter (administrative lookup)
  // First get a member to find their email
  const membersList = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(membersList);
  // Note: Email is not exposed in ISummary, but the filter should still work
  // Testing with a known email format (this may return empty if no exact match)
  const emailResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        email: "nonexistent@example.com" as string & tags.Format<"email">,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(emailResult);
  // Email exact match should return 0 or 1 results
  TestValidator.predicate(
    "Email exact match returns at most 1 result",
    emailResult.data.length <= 1,
  );
  // Test 9: Empty result set when no members match
  const emptyResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        search: "zzzzzzzzzzyyyyyyyyyxxxxxxx12345nonexistent",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "Non-matching search returns empty result set",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "Empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // Test 10: Sort by karma descending (default)
  const karmaDescResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        sort: "-karma",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(karmaDescResult);
  // Verify descending order
  for (let i = 1; i < karmaDescResult.data.length; i++) {
    TestValidator.predicate(
      "Karma is in descending order",
      karmaDescResult.data[i - 1].karma >= karmaDescResult.data[i].karma,
    );
  }
  // Test 11: Sort by created_at ascending
  const createdAscResult = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(createdAscResult);
  // Verify ascending order
  for (let i = 1; i < createdAscResult.data.length; i++) {
    const prevDate = new Date(createdAscResult.data[i - 1].created_at);
    const currDate = new Date(createdAscResult.data[i].created_at);
    TestValidator.predicate(
      "Created_at is in ascending order",
      prevDate <= currDate,
    );
  }
  // Test 12: Sort by username ascending (alphabetical)
  const usernameAscResult =
    await api.functional.communityPlatform.members.index(connection, {
      body: {
        sort: "username",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(usernameAscResult);
  // Verify alphabetical order
  for (let i = 1; i < usernameAscResult.data.length; i++) {
    TestValidator.predicate(
      "Username is in alphabetical order",
      usernameAscResult.data[i - 1].username.localeCompare(
        usernameAscResult.data[i].username,
      ) <= 0,
    );
  }
}
