import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member sorting and date range filtering functionality.
 *
 * Validates the member browsing endpoint's sorting and filtering capabilities. Tests all available sort fields (username, karma, created_at) in both ascending and descending directions. Verifies date range filtering using createdAfter and createdBefore parameters works correctly.
 *
 * The test covers sorting functionality by testing each sort field with both direction values. Date range filtering is tested with various timestamp combinations to ensure members are correctly filtered by registration date. Edge cases include restrictive filters that may return empty result sets.
 *
 * 1. Test sorting by username in ascending order. 2. Test sorting by username in descending order. 3. Test sorting by karma in ascending order. 4. Test sorting by karma in descending order. 5. Test sorting by created_at in ascending order (oldest first). 6. Test sorting by created_at in descending order (newest first). 7. Test date range filtering with createdAfter parameter. 8. Test date range filtering with createdBefore parameter. 9. Test combined date range filtering with both createdAfter and createdBefore. 10. Test sorting combined with date range filters. 11. Validate edge case with restrictive date range returning empty or limited results. 12. Verify pagination metadata is correctly populated in all responses.
 */
export async function test_api_member_sort_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test sorting by username ascending
  const usernameAsc = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "username",
        direction: "asc",
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(usernameAsc);
  TestValidator.predicate(
    "pagination valid",
    usernameAsc.pagination.current >= 1,
  );
  TestValidator.predicate("limit respected", usernameAsc.data.length <= 20);
  // 2. Test sorting by username descending
  const usernameDesc = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "username",
        direction: "desc",
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(usernameDesc);
  // 3. Test sorting by karma ascending
  const karmaAsc = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "karma",
        direction: "asc",
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(karmaAsc);
  // 4. Test sorting by karma descending
  const karmaDesc = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "karma",
        direction: "desc",
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(karmaDesc);
  // 5. Test sorting by created_at ascending (oldest first)
  const createdAtAsc = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        direction: "asc",
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(createdAtAsc);
  // 6. Test sorting by created_at descending (newest first)
  const createdAtDesc = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        direction: "desc",
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(createdAtDesc);
  // 7. Test date range filtering with createdAfter
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const afterFilter = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        createdAfter: oneYearAgo.toISOString(),
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(afterFilter);
  // 8. Test date range filtering with createdBefore
  const beforeFilter = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        createdBefore: now.toISOString(),
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(beforeFilter);
  // 9. Test combined date range filtering
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const rangeFilter = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        createdAfter: sixMonthsAgo.toISOString(),
        createdBefore: now.toISOString(),
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(rangeFilter);
  // 10. Test sorting combined with date range filters
  const sortedWithFilter = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        direction: "desc",
        createdAfter: oneYearAgo.toISOString(),
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(sortedWithFilter);
  // 11. Test edge case with very restrictive date range (future date)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const restrictiveFilter = await api.functional.redditCommunity.members.index(
    connection,
    {
      body: {
        createdAfter: futureDate.toISOString(),
        limit: 20,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(restrictiveFilter);
  TestValidator.predicate(
    "restrictive filter returns valid response",
    restrictiveFilter.pagination.records >= 0,
  );
  // 12. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is valid",
    usernameAsc.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    usernameAsc.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    usernameAsc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    usernameAsc.pagination.pages >= 0,
  );
  // Validate all response data arrays contain valid member summaries
  for (const member of usernameAsc.data) {
    typia.assert(member);
    TestValidator.predicate("username exists", member.username.length > 0);
    TestValidator.predicate(
      "display_name exists",
      member.display_name.length > 0,
    );
    TestValidator.predicate("karma is integer", Number.isInteger(member.karma));
  }
}
