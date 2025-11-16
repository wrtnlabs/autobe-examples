import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

/**
 * Validate guest user search includeDeleted flag behavior.
 *
 * Business purpose: This test ensures that the administrative search endpoint
 * for guest users correctly includes or excludes logically deleted guest user
 * surrogate records based on the includeDeleted flag in
 * ICommunityPlatformGuestuser.IRequest. Admin operators rely on this behavior
 * when analyzing historical guest activity and when they want to focus only on
 * active pseudo-accounts.
 *
 * High-level steps:
 *
 * 1. Join as an adminUser via POST /auth/adminUser/join to obtain an authenticated
 *    admin context (JWT is wired automatically into connection.headers by the
 *    SDK join function).
 * 2. Call PATCH /communityPlatform/adminUser/guestUsers with includeDeleted=true
 *    and a reasonable page/limit so that the search returns a representative
 *    slice of records. We assume test fixtures or seeded data ensure that at
 *    least one logically deleted guest record (deleted_at non-null) exists in
 *    the dataset.
 * 3. Assert that the response is structurally valid using typia.assert, then
 *    verify via TestValidator that at least one returned
 *    ICommunityPlatformGuestuser.ISummary has deleted_at !== null, proving that
 *    the endpoint can surface logically deleted guest records when
 *    includeDeleted is enabled.
 * 4. Call the same search again but with includeDeleted=false and confirm that all
 *    returned guest summaries have deleted_at === null or deleted_at ===
 *    undefined, demonstrating that deleted surrogates are filtered out when
 *    includeDeleted is disabled.
 * 5. Optionally, when both result sets are non-empty, ensure that the
 *    includeDeleted result set is not smaller than the excludeDeleted one,
 *    reinforcing that includeDeleted widens (or maintains) visibility.
 */
export async function test_api_guest_users_search_includes_deleted_when_requested(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain authorized context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. First search: includeDeleted = true
  const includeDeletedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
    includeDeleted: true,
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const includeDeletedPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.adminUser.guestUsers.index(
      connection,
      {
        body: includeDeletedRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(includeDeletedPage);

  // Basic pagination sanity: records must be >= number of returned rows
  TestValidator.predicate(
    "includeDeleted page records should be at least the number of returned summaries",
    includeDeletedPage.pagination.records >= includeDeletedPage.data.length,
  );

  // Business rule: when includeDeleted=true, at least one record with
  // deleted_at non-null should exist (assuming seeded fixtures)
  const hasDeletedRecord: boolean = includeDeletedPage.data.some((summary) => {
    return summary.deleted_at !== null && summary.deleted_at !== undefined;
  });

  TestValidator.predicate(
    "includeDeleted=true should yield at least one logically deleted guest user when fixtures exist",
    hasDeletedRecord,
  );

  // 3. Second search: includeDeleted = false
  const excludeDeletedRequestBody = {
    page: includeDeletedRequestBody.page,
    limit: includeDeletedRequestBody.limit,
    includeDeleted: false,
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const excludeDeletedPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.adminUser.guestUsers.index(
      connection,
      {
        body: excludeDeletedRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(excludeDeletedPage);

  // Business rule: when includeDeleted=false, no records should have
  // deleted_at non-null
  const hasAnyDeletedInExclude: boolean = excludeDeletedPage.data.some(
    (summary) =>
      summary.deleted_at !== null && summary.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "includeDeleted=false should suppress logically deleted guest users",
    hasAnyDeletedInExclude === false,
  );

  // Optional sanity check: if both pages have data, ensure that
  // the includeDeleted page has data count at least as large as the exclude
  // page, because it should be a superset or equal when filters are the same
  if (
    includeDeletedPage.data.length > 0 &&
    excludeDeletedPage.data.length > 0
  ) {
    TestValidator.predicate(
      "includeDeleted=true should not reduce result set size compared to includeDeleted=false",
      includeDeletedPage.data.length >= excludeDeletedPage.data.length,
    );
  }
}
