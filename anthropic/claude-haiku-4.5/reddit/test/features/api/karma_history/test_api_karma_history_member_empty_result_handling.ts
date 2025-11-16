import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test empty result handling for karma history member queries.
 *
 * Validates that the API correctly handles queries that return no karma history
 * records. The test creates a new member account and queries their karma
 * history with various filters that should produce empty results. Verifies
 * that:
 *
 * 1. Empty queries return successfully with empty data array
 * 2. Pagination metadata correctly shows zero records and zero pages
 * 3. Response structure remains consistent even with no data
 * 4. No error messages are returned for legitimate empty queries
 *
 * Steps:
 *
 * 1. Create a new member account
 * 2. Query karma history for newly created member (should be empty)
 * 3. Filter by change reason that never occurred for this member
 * 4. Filter by date range with no karma changes
 * 5. Filter by non-existent member ID
 * 6. Validate all responses have correct empty pagination structure
 */
export async function test_api_karma_history_member_empty_result_handling(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const newMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(newMember);

  // Step 2: Query karma history for newly created member (should be empty)
  const emptyHistoryForNewMember =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: newMember.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyHistoryForNewMember);

  // Verify pagination metadata for empty result
  TestValidator.equals(
    "empty member history should have zero records",
    emptyHistoryForNewMember.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty member history should have zero pages",
    emptyHistoryForNewMember.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty member history data array should be empty",
    emptyHistoryForNewMember.data.length,
    0,
  );
  TestValidator.equals(
    "response structure maintains pagination info with empty data",
    emptyHistoryForNewMember.data,
    [],
  );

  // Step 3: Filter by change reason that never occurred for this member
  const emptyHistoryByReason =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: newMember.id,
          change_reason: "user_banned",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyHistoryByReason);
  TestValidator.equals(
    "filtering by reason with no matches should return empty data",
    emptyHistoryByReason.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows zero records for empty reason filter",
    emptyHistoryByReason.pagination.records,
    0,
  );

  // Step 4: Filter by date range with no karma changes
  const futureStartDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureEndDate = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow

  const emptyHistoryByDateRange =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: newMember.id,
          created_at_start: futureStartDate,
          created_at_end: futureEndDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyHistoryByDateRange);
  TestValidator.equals(
    "filtering by future date range should return empty data",
    emptyHistoryByDateRange.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows zero pages for empty date range",
    emptyHistoryByDateRange.pagination.pages,
    0,
  );

  // Step 5: Filter by non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyHistoryByNonExistentMember =
    await api.functional.communityPlatform.member.karmaHistory.index(
      connection,
      {
        body: {
          member_id: nonExistentMemberId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyHistoryByNonExistentMember);
  TestValidator.equals(
    "querying non-existent member should return empty data",
    emptyHistoryByNonExistentMember.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be zero for non-existent member",
    emptyHistoryByNonExistentMember.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero for non-existent member",
    emptyHistoryByNonExistentMember.pagination.pages,
    0,
  );

  // Step 6: Validate pagination metadata structure consistency
  TestValidator.predicate(
    "pagination current page is valid",
    emptyHistoryForNewMember.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    emptyHistoryForNewMember.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    emptyHistoryByDateRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    emptyHistoryByNonExistentMember.pagination.pages >= 0,
  );
}
