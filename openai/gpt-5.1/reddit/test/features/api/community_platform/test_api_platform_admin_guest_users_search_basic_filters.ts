import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

/**
 * Validate basic guest user search and pagination for platform admins.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator using /auth/platformAdmin/join.
 *
 *    - Use ICommunityPlatformPlatformadmin.IJoin with realistic fields.
 *    - Rely on SDK to attach the issued access token to connection headers.
 * 2. As that admin, create a new account status via
 *    /communityPlatform/platformAdmin/accountStatuses using
 *    ICommunityPlatformAccountStatus.ICreate, configured as an ACTIVE-like
 *    status (login/posting/voting allowed, no manual review required).
 * 3. Call PATCH /communityPlatform/platformAdmin/guestUsers with an
 *    ICommunityPlatformGuestuser.IRequest body that:
 *
 *    - Requests page 1 with pageSize 20
 *    - Sets account_status_id to the created status.id
 *    - Sets include_deleted to false
 *    - Sets sort_by = "created_at" and sort_direction = "desc"
 *    - Leaves other filters undefined
 * 4. Validate that the response is a well-formed
 *    IPageICommunityPlatformGuestuser.ISummary and that pagination wiring and
 *    basic filtering behave as expected.
 *
 * Validations:
 *
 * - Response type and structure: typia.assert on the page object.
 * - Pagination semantics:
 *
 *   - Pagination.current === 1
 *   - Pagination.limit === 20
 *   - Pagination.records >= 0
 *   - Pagination.pages is consistent with (records, limit) relationship.
 * - Data semantics:
 *
 *   - Data is an array of ICommunityPlatformGuestuser.ISummary entries
 *   - For each entry, if accountStatus is defined, its id equals the
 *       request.account_status_id used in the filter.
 * - Sorting semantics:
 *
 *   - If there are at least two entries in data, ensure that created_at of the
 *       first entry is greater than or equal to created_at of the second entry
 *       in lexicographical order (ISO 8601 date-time strings), which
 *       approximates the requested "created_at desc" ordering.
 */
export async function test_api_platform_admin_guest_users_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authorized connection
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create an ACTIVE-like account status for filtering guests
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(8)}`,
    label: "Active Guest Status",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Build request body for guest user search with basic filters
  const requestBody = {
    page: 1,
    pageSize: 20,
    account_status_id: createdStatus.id,
    include_deleted: false,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformGuestuser.IRequest;

  // 4. Call the guest users search endpoint as the authenticated admin
  const page =
    await api.functional.communityPlatform.platformAdmin.guestUsers.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(page);

  const pagination = page.pagination;

  // Pagination: current page and limit
  TestValidator.equals(
    "pagination.current should equal requested page (1)",
    pagination.current,
    requestBody.page,
  );

  TestValidator.equals(
    "pagination.limit should equal requested pageSize (20)",
    pagination.limit,
    requestBody.pageSize,
  );

  // records must be non-negative (already guaranteed by type, but assert business rule)
  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );

  // pages must be consistent with records and limit when limit > 0
  if (pagination.limit > 0) {
    const expectedPages =
      pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination.pages should be consistent with records and limit",
      pagination.pages,
      expectedPages,
    );
  }

  // data array semantics
  const summaries = page.data;
  TestValidator.predicate(
    "data array should contain zero or more guest user summaries",
    Array.isArray(summaries) && summaries.length >= 0,
  );

  // Each summary should satisfy ICommunityPlatformGuestuser.ISummary by design,
  // already asserted via typia.assert on the page. Additional business checks:
  for (const summary of summaries) {
    // If accountStatus is present, its id should match the filtered status id
    if (summary.accountStatus !== undefined) {
      typia.assert(summary.accountStatus);
      TestValidator.equals(
        "summary.accountStatus.id should match requested account_status_id",
        summary.accountStatus.id,
        requestBody.account_status_id,
      );
    }
  }

  // Sorting semantics: if at least two entries, ensure non-increasing order by created_at
  if (summaries.length >= 2) {
    const first = summaries[0];
    const second = summaries[1];

    TestValidator.predicate(
      "guest summaries should be ordered by created_at desc (non-increasing)",
      first.created_at >= second.created_at,
    );
  }
}
