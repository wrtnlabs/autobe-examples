import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_filtering_by_registration_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering members by registration date range using createdAfter and createdBefore parameters.
  //
  // Steps:
  // 1. Create test members with known registration dates
  // 2. Call PATCH /redditClone/members with createdAfter and createdBefore forming a date range
  // 3. Verify all returned members have created_at within the specified range
  // 4. Test with only createdAfter (no lower bound) to find members registered after a date
  // 5. Test with only createdBefore (no upper bound) to find members registered before a date
  // 6. Test with date range containing no members to verify empty results
  // 7. Verify pagination metadata is accurate for filtered results
  // Define date range for testing
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  // Format dates to ISO 8601
  const rangeStart = thirtyDaysAgo.toISOString();
  const rangeEnd = fiveDaysAgo.toISOString();
  const middleDate = fifteenDaysAgo.toISOString();
  // Test 1: Filter with both createdAfter and createdBefore (date range)
  const rangeResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        createdAfter: rangeStart,
        createdBefore: rangeEnd,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(rangeResult);
  // Verify all returned members are within the date range
  for (const member of rangeResult.data) {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      "member created_at within range",
      createdAt >= thirtyDaysAgo && createdAt <= fiveDaysAgo,
    );
  }
  // Test 2: Filter with only createdAfter (no lower bound)
  const afterResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        createdAfter: middleDate,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(afterResult);
  // Verify all returned members were created after the middle date
  for (const member of afterResult.data) {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      "member created_after middle date",
      createdAt >= fifteenDaysAgo,
    );
  }
  // Test 3: Filter with only createdBefore (no upper bound)
  const beforeResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        createdBefore: tenDaysAgo.toISOString(),
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(beforeResult);
  // Verify all returned members were created before the ten days ago date
  for (const member of beforeResult.data) {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      "member created_before ten days ago",
      createdAt <= tenDaysAgo,
    );
  }
  // Test 4: Filter with date range that should contain no members (future date range)
  const futureStart = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
  const emptyResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        createdAfter: futureStart.toISOString(),
        createdBefore: futureEnd.toISOString(),
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty results for future date range
  TestValidator.equals(
    "no members in future date range",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for empty range",
    emptyResult.pagination.records,
    0,
  );
  // Test 5: Verify pagination metadata is accurate for filtered results
  // First get total members
  const allMembersResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {} satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(allMembersResult);
  // Get members with date filter
  const filteredResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        createdAfter: rangeStart,
        createdBefore: rangeEnd,
        limit: 10,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(filteredResult);
  // Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has valid limit",
    filteredResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    filteredResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    filteredResult.pagination.pages >= 0,
  );
  // Verify pages calculation is correct
  if (filteredResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      filteredResult.pagination.records / filteredResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      filteredResult.pagination.pages,
      expectedPages,
    );
  }
  // Test 6: Combined search and date range filtering
  const searchWithDateResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        search: "a", // Common letter that should match some usernames
        createdAfter: rangeStart,
        createdBefore: rangeEnd,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(searchWithDateResult);
  // Verify all results match both search and date criteria
  for (const member of searchWithDateResult.data) {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      "member matches date range with search",
      createdAt >= thirtyDaysAgo && createdAt <= fiveDaysAgo,
    );
    TestValidator.predicate(
      "member username contains search term",
      member.username.toLowerCase().includes("a"),
    );
  }
}
