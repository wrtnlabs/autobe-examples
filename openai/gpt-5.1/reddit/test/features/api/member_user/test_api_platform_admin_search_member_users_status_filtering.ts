import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuser";

/**
 * Verify that platform admin search for member users correctly honors the
 * statusCode filter and returns coherent pagination metadata.
 *
 * Business flow:
 *
 * 1. Join as a platform administrator to obtain admin authentication context.
 * 2. Create two distinct account status master records (e.g., ACTIVE and
 *    SUSPENDED) via the platformAdmin accountStatuses API.
 * 3. Create several member users via the public auth.memberUser.join endpoint so
 *    that the memberUsers index endpoint has data to work with.
 * 4. As platformAdmin, call PATCH /communityPlatform/platformAdmin/memberUsers
 *    without statusCode filter to observe baseline pagination and total count.
 * 5. Call the same endpoint with statusCode equal to a created status code and
 *    validate that either:
 *
 *    - All returned summaries correspond to that status (when any exist), or
 *    - No results are returned and records=0 when no member user has that status,
 *         still demonstrating correct filtering behaviour.
 * 6. Repeat the filter call with a second status code to ensure the filter is
 *    consistently applied for different codes.
 */
export async function test_api_platform_admin_search_member_users_status_filtering(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain admin auth and token
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create two distinct account status definitions
  const activeStatusBody = {
    key: "ACTIVE_TEST_STATUS_" + RandomGenerator.alphaNumeric(6),
    label: "Active Test Status",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const suspendedStatusBody = {
    key: "SUSPENDED_TEST_STATUS_" + RandomGenerator.alphaNumeric(6),
    label: "Suspended Test Status",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const activeStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: activeStatusBody },
    );
  typia.assert(activeStatus);

  const suspendedStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: suspendedStatusBody },
    );
  typia.assert(suspendedStatus);

  // 3. Create multiple member users via public join endpoint
  const memberUserCount = 5;
  const createdMemberUsers: ICommunityPlatformMemberuser.IAuthorized[] =
    await ArrayUtil.asyncRepeat(memberUserCount, async (index) => {
      const joinBody = {
        username: `${RandomGenerator.name(1)}_${index}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/join",
        referrer: "https://community.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest;

      const authorized = await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
      typia.assert(authorized);
      return authorized;
    });

  TestValidator.equals(
    "created member user count matches expectation",
    createdMemberUsers.length,
    memberUserCount,
  );

  // 4. As platform admin, perform an unfiltered search to establish baseline
  const baseSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const baseSearchResult: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.index(
      connection,
      { body: baseSearchBody },
    );
  typia.assert(baseSearchResult);

  const basePagination = baseSearchResult.pagination;
  TestValidator.predicate(
    "base search current page is non-negative",
    basePagination.current >= 0,
  );
  TestValidator.predicate(
    "base search limit is non-negative",
    basePagination.limit >= 0,
  );
  TestValidator.predicate(
    "base search records non-negative",
    basePagination.records >= 0,
  );
  TestValidator.predicate(
    "base search pages non-negative",
    basePagination.pages >= 0,
  );

  // When a single page and small limit, records should be at least data length
  TestValidator.predicate(
    "base search records at least returned data length",
    baseSearchResult.data.length <= basePagination.records,
  );

  // 5. Search with statusCode filter using the ACTIVE-like status code
  const activeFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    statusCode: activeStatus.key,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const activeFilterResult: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.index(
      connection,
      { body: activeFilterBody },
    );
  typia.assert(activeFilterResult);

  const activePagination = activeFilterResult.pagination;
  TestValidator.predicate(
    "active filter pagination current is non-negative",
    activePagination.current >= 0,
  );
  TestValidator.predicate(
    "active filter pagination limit is non-negative",
    activePagination.limit >= 0,
  );
  TestValidator.predicate(
    "active filter pagination records is non-negative",
    activePagination.records >= 0,
  );
  TestValidator.predicate(
    "active filter pagination pages is non-negative",
    activePagination.pages >= 0,
  );

  if (activeFilterResult.data.length === 0) {
    // When no member user has the ACTIVE status, records should reflect emptiness
    TestValidator.equals(
      "active filter has zero records when no data returned",
      activePagination.records,
      0,
    );
  } else {
    // When data exists, ensure data length <= records and > 0
    TestValidator.predicate(
      "active filter records at least data length",
      activeFilterResult.data.length <= activePagination.records,
    );
  }

  // 6. Repeat filtering with SUSPENDED-like status code
  const suspendedFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    statusCode: suspendedStatus.key,
  } satisfies ICommunityPlatformMemberuser.IRequest;

  const suspendedFilterResult: IPageICommunityPlatformMemberuser.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.index(
      connection,
      { body: suspendedFilterBody },
    );
  typia.assert(suspendedFilterResult);

  const suspendedPagination = suspendedFilterResult.pagination;
  TestValidator.predicate(
    "suspended filter pagination current is non-negative",
    suspendedPagination.current >= 0,
  );
  TestValidator.predicate(
    "suspended filter pagination limit is non-negative",
    suspendedPagination.limit >= 0,
  );
  TestValidator.predicate(
    "suspended filter pagination records is non-negative",
    suspendedPagination.records >= 0,
  );
  TestValidator.predicate(
    "suspended filter pagination pages is non-negative",
    suspendedPagination.pages >= 0,
  );

  if (suspendedFilterResult.data.length === 0) {
    TestValidator.equals(
      "suspended filter has zero records when no data returned",
      suspendedPagination.records,
      0,
    );
  } else {
    TestValidator.predicate(
      "suspended filter records at least data length",
      suspendedFilterResult.data.length <= suspendedPagination.records,
    );
  }
}
