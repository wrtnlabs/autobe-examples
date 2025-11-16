import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSuspension";

/**
 * Test that the moderator suspension search returns appropriate empty results
 * when filtering criteria match no suspensions.
 *
 * This test validates the API's behavior when searching for suspensions with
 * filters that have no matching records. The test creates a moderator account,
 * then performs multiple search operations with different filter combinations
 * that should return zero results:
 *
 * 1. Search for suspensions by a non-existent member username
 * 2. Search for suspensions within a date range that contains no suspensions
 * 3. Search for suspensions by a non-existent member ID (UUID)
 * 4. Search for a suspension reason that doesn't match any existing suspensions
 *
 * For each search operation, the test validates that:
 *
 * - The response structure is correct (pagination metadata and empty data array)
 * - The pagination shows zero records (records: 0)
 * - The data array is empty (data.length === 0)
 * - The current page is 1 (since no results)
 * - The total pages is 0 (no pages available for zero records)
 * - The response does not cause any errors
 * - The API properly handles empty result sets without throwing exceptions
 */
export async function test_api_member_suspension_search_empty_results(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Test 1: Search by non-existent member username
  const nonExistentUsername = RandomGenerator.alphabets(15);
  const result1: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          member_username: nonExistentUsername,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "empty result for non-existent username pagination records",
    result1.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent username data array",
    result1.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent username current page",
    result1.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result for non-existent username total pages",
    result1.pagination.pages,
    0,
  );

  // Test 2: Search within date range with no suspensions (far future date range)
  const futureStart = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureEnd = new Date(
    Date.now() + 730 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const result2: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: futureStart,
          suspended_before: futureEnd,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "empty result for future date range pagination records",
    result2.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for future date range data array",
    result2.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for future date range current page",
    result2.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result for future date range total pages",
    result2.pagination.pages,
    0,
  );

  // Test 3: Search by non-existent member ID (UUID)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const result3: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          member_id: nonExistentMemberId,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "empty result for non-existent member ID pagination records",
    result3.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent member ID data array",
    result3.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent member ID current page",
    result3.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result for non-existent member ID total pages",
    result3.pagination.pages,
    0,
  );

  // Test 4: Search by suspension reason that doesn't exist
  const nonExistentReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const result4: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          search: nonExistentReason,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result4);
  TestValidator.equals(
    "empty result for non-existent reason pagination records",
    result4.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent reason data array",
    result4.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent reason current page",
    result4.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result for non-existent reason total pages",
    result4.pagination.pages,
    0,
  );

  // Test 5: Verify pagination metadata consistency with zero records
  const result5: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result5);
  TestValidator.predicate(
    "pagination limit matches request",
    result5.pagination.limit === 50,
  );
  TestValidator.predicate(
    "pagination is valid structure",
    result5.pagination.records >= 0 && result5.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array is array type",
    Array.isArray(result5.data),
  );
}
