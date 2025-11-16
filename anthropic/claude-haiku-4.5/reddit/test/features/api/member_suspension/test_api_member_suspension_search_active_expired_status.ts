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
 * Test the include_expired flag functionality for filtering active versus
 * expired suspensions.
 *
 * This test validates the suspension search API's ability to correctly filter
 * member suspensions based on their expiration status. The include_expired
 * parameter controls whether expired suspensions are included in search
 * results, and permanent suspensions (with null expires_at) should always be
 * included regardless of the flag setting.
 *
 * Test workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Search suspensions with include_expired=false to get active/permanent
 *    suspensions
 * 3. Search suspensions with include_expired=true to get all suspensions
 * 4. Search without include_expired parameter to verify default behavior (should
 *    be false)
 * 5. Verify that include_expired=true returns same or more results than
 *    include_expired=false
 * 6. Verify default behavior matches include_expired=false
 * 7. Test sorting and filtering options with different include_expired values
 */
export async function test_api_member_suspension_search_active_expired_status(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://community.example.com/auth/register",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreate,
  });
  typia.assert(moderator);

  // 2. Search with include_expired=false (should return only active and permanent)
  const activeOnlyResult =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          include_expired: false,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(activeOnlyResult);

  // Verify pagination structure
  TestValidator.predicate(
    "active-only result has pagination",
    activeOnlyResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "active-only result has data array",
    Array.isArray(activeOnlyResult.data),
  );

  // 3. Search with include_expired=true (should return all suspensions)
  const allSuspensionsResult =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          include_expired: true,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(allSuspensionsResult);

  TestValidator.predicate(
    "all suspensions result has pagination",
    allSuspensionsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "all suspensions result has data array",
    Array.isArray(allSuspensionsResult.data),
  );

  // 4. Search without include_expired (should default to false - only active/permanent)
  const defaultResult =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(defaultResult);

  TestValidator.predicate(
    "default result has pagination",
    defaultResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "default result has data array",
    Array.isArray(defaultResult.data),
  );

  // 5. Verify that include_expired=true returns same or more results than include_expired=false
  TestValidator.predicate(
    "include_expired=true returns more or equal results than include_expired=false",
    allSuspensionsResult.data.length >= activeOnlyResult.data.length,
  );

  // 6. Verify that default behavior matches include_expired=false
  TestValidator.equals(
    "default behavior matches include_expired=false",
    defaultResult.data.length,
    activeOnlyResult.data.length,
  );

  // 7. Verify pagination information is consistent
  TestValidator.predicate(
    "pagination current page is correct",
    activeOnlyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    activeOnlyResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    activeOnlyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    activeOnlyResult.pagination.pages >= 0,
  );

  // 8. Test with search query to filter suspensions
  const searchResult =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          search: "violation",
          include_expired: true,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result has valid pagination",
    searchResult.pagination !== undefined && Array.isArray(searchResult.data),
  );

  // 9. Test sorting by reason
  const sortedByReasonResult =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "reason",
          sort_order: "asc",
          include_expired: false,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortedByReasonResult);

  TestValidator.predicate(
    "sorted result is valid",
    sortedByReasonResult.pagination !== undefined &&
      Array.isArray(sortedByReasonResult.data),
  );

  // 10. Test with descending sort order including expired
  const descSortResult =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "suspended_at",
          sort_order: "desc",
          include_expired: true,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(descSortResult);

  TestValidator.predicate(
    "descending sort result is valid",
    descSortResult.pagination !== undefined &&
      Array.isArray(descSortResult.data),
  );
}
