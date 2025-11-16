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
 * Test comprehensive pagination functionality for the member suspension search
 * endpoint.
 *
 * This test validates that the member suspension search API correctly handles
 * pagination across multiple pages with various limit values. It verifies
 * pagination metadata accuracy, page navigation, and edge cases like requesting
 * beyond available pages or single-item pages.
 *
 * The test follows this workflow:
 *
 * 1. Create a moderator account for authentication
 * 2. Search member suspensions with default pagination settings
 * 3. Test pagination with different page sizes (1, 20, 100)
 * 4. Verify pagination metadata (current page, limit, total records, total pages)
 * 5. Test edge cases (page beyond total, single-item pagination, maximum limit)
 * 6. Validate page consistency across different requests
 */
export async function test_api_member_suspension_search_pagination_navigation(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Search member suspensions with default pagination settings (page=1, limit=20)
  const defaultPageResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(defaultPageResult);

  // Validate pagination metadata for default result
  TestValidator.predicate(
    "default pagination current page should be 1",
    defaultPageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination limit should be greater than 0",
    defaultPageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination records should be non-negative",
    defaultPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages should be non-negative",
    defaultPageResult.pagination.pages >= 0,
  );

  // 3. Test pagination with limit=1 (single-item pages)
  const singleItemPageResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(singleItemPageResult);

  TestValidator.equals(
    "single-item pagination limit should be 1",
    singleItemPageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single-item page data should have at most 1 item",
    singleItemPageResult.data.length <= 1,
  );

  // 4. Test pagination with default limit (20)
  const defaultLimitResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(defaultLimitResult);

  TestValidator.equals(
    "default limit pagination limit should be 20",
    defaultLimitResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default limit page data should have at most 20 items",
    defaultLimitResult.data.length <= 20,
  );

  // 5. Test pagination with maximum limit (100)
  const maxLimitResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit pagination limit should be 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit page data should have at most 100 items",
    maxLimitResult.data.length <= 100,
  );

  // 6. Verify pagination calculations
  const calculatedTotalPages = Math.ceil(
    maxLimitResult.pagination.records / maxLimitResult.pagination.limit,
  );
  TestValidator.equals(
    "calculated total pages should match pagination.pages",
    maxLimitResult.pagination.pages,
    calculatedTotalPages,
  );

  // 7. Test page navigation - if there are multiple pages, navigate to second page
  if (maxLimitResult.pagination.pages > 1) {
    const secondPageResult: IPageICommunityPlatformMemberSuspension.ISummary =
      await api.functional.communityPlatform.moderator.memberSuspensions.index(
        connection,
        {
          body: {
            limit: 100,
            page: 2,
          } satisfies ICommunityPlatformMemberSuspension.IRequest,
        },
      );
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page current page should be 2",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "second page data should be different from first page",
      secondPageResult.data,
      maxLimitResult.data,
    );
  }

  // 8. Test page beyond total pages (if possible)
  const beyondPageResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          limit: 20,
          page: 9999,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(beyondPageResult);

  // Page beyond total should return empty data but valid pagination info
  TestValidator.predicate(
    "page beyond total should have empty data array",
    beyondPageResult.data.length === 0,
  );
  TestValidator.predicate(
    "page beyond total should have valid pagination metadata",
    beyondPageResult.pagination.current >= 1,
  );

  // 9. Verify consistency - search again with same parameters should give same count
  const consistencyCheckResult: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.moderator.memberSuspensions.index(
      connection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(consistencyCheckResult);

  TestValidator.equals(
    "consistency check total records should match",
    consistencyCheckResult.pagination.records,
    defaultLimitResult.pagination.records,
  );
}
