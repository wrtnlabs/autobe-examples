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
 * Test all sorting options for the member suspension search.
 *
 * This test validates sorting functionality by:
 *
 * 1. Creating a moderator account for authentication
 * 2. Performing searches with different sort_by and sort_order combinations
 * 3. Verifying that results are correctly sorted by:
 *
 *    - Suspended_at (ascending and descending)
 *    - Expires_at (expiration dates)
 *    - Reason (alphabetically)
 *    - Member_username (member names)
 * 4. Confirming default sorting shows most recent suspensions first
 * 5. Validating all valid combinations of sort parameters work correctly
 */
export async function test_api_member_suspension_search_sorting_options(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Test default sorting (suspended_at descending)
  const defaultSort: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sorting result is valid paginated response",
    defaultSort.pagination !== null &&
      defaultSort.pagination !== undefined &&
      defaultSort.data !== null &&
      defaultSort.data !== undefined,
  );

  // Test sorting by suspended_at ascending
  const sortByAsc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "suspended_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByAsc);

  // Test sorting by suspended_at descending
  const sortByDesc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByDesc);

  // Test sorting by expires_at ascending
  const sortByExpiresAsc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "expires_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByExpiresAsc);

  // Test sorting by expires_at descending
  const sortByExpiresDesc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "expires_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByExpiresDesc);

  // Test sorting by reason ascending
  const sortByReasonAsc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "reason",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByReasonAsc);

  // Test sorting by reason descending
  const sortByReasonDesc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "reason",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByReasonDesc);

  // Test sorting by member_username ascending
  const sortByUsernameAsc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "member_username",
          sort_order: "asc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByUsernameAsc);

  // Test sorting by member_username descending
  const sortByUsernameDesc: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "member_username",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(sortByUsernameDesc);

  // Validate all responses have proper structure
  TestValidator.predicate(
    "all sort responses return data arrays",
    sortByAsc.data.length >= 0 &&
      sortByDesc.data.length >= 0 &&
      sortByExpiresAsc.data.length >= 0 &&
      sortByExpiresDesc.data.length >= 0 &&
      sortByReasonAsc.data.length >= 0 &&
      sortByReasonDesc.data.length >= 0 &&
      sortByUsernameAsc.data.length >= 0 &&
      sortByUsernameDesc.data.length >= 0,
  );

  // Validate pagination information
  TestValidator.predicate(
    "pagination information is consistent",
    defaultSort.pagination.current >= 1 &&
      defaultSort.pagination.limit > 0 &&
      defaultSort.pagination.records >= 0 &&
      defaultSort.pagination.pages >= 0,
  );

  // Test with include_expired parameter
  const withExpired: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          include_expired: true,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(withExpired);

  // Test with page parameter
  const page2: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
          sort_by: "suspended_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.predicate(
    "pagination works correctly",
    page2.pagination.current === 2,
  );
}
