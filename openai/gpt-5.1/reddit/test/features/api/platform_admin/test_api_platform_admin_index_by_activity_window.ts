import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadmin";

/**
 * Search platform administrators by last activity window with pagination and
 * sorting.
 *
 * Business goals
 *
 * - Ensure a platform admin actor can search other platform admins by a
 *   last-activity time window and pagination parameters.
 * - Confirm that recently created admins appear when the window covers "now" and
 *   are excluded when searching an old window in the past.
 * - Validate pagination metadata and basic sorting semantics.
 *
 * Scenario steps
 *
 * 1. Create and log in as a baseline platform administrator using the join
 *    endpoint. This call also sets the Authorization header for the connection
 *    through the SDK.
 * 2. Create at least one account status definition so that the master table is
 *    non-empty.
 * 3. Create an additional platform administrator via the same join endpoint.
 * 4. Build a recent activity window: lastActiveFrom = now - 24 hours, lastActiveTo
 *    = now. Use reasonable page and limit, and request sorting by lastActiveAt
 *    in descending order.
 * 5. Call PATCH /communityPlatform/platformAdmin/platformAdmins with this request
 *    and assert the response type and pagination integrity.
 * 6. Assert that both just-created admins are present in the result set.
 * 7. Build an old activity window far in the past and call the search again.
 *    Assert that none of the newly created admins are present in this result
 *    set.
 * 8. Optionally verify that results in the first search are ordered by created_at
 *    descending, as a proxy for lastActiveAt.
 */
export async function test_api_platform_admin_index_by_activity_window(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a baseline platform admin
  const now: Date = new Date();
  const baselineJoinInput = {
    username: `baseline_${RandomGenerator.alphaNumeric(8)}`,
    email: `baseline_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register", // any valid URI
    referrer: "https://admin.example.com/", // any valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const baselineAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: baselineJoinInput,
    });
  typia.assert(baselineAdmin);

  // 2. Ensure at least one account status exists
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: "Active account status created for E2E test.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Create an additional platform admin
  const secondaryJoinInput = {
    username: `secondary_${RandomGenerator.alphaNumeric(8)}`,
    email: `secondary_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register", // any valid URI
    referrer: "https://admin.example.com/", // any valid URI
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const secondaryAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondaryJoinInput,
    });
  typia.assert(secondaryAdmin);

  // 4. Build a recent activity window (last 24 hours)
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const fromRecent: string = new Date(
    now.getTime() - twentyFourHoursMs,
  ).toISOString();
  const toRecent: string = now.toISOString();

  const recentRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    statusIds: undefined,
    createdFrom: null,
    createdTo: null,
    lastActiveFrom: fromRecent,
    lastActiveTo: toRecent,
    sortBy: "lastActiveAt",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const recentPage: IPageICommunityPlatformPlatformadmin.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      {
        body: recentRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadmin.ISummary>(recentPage);

  // 5. Validate pagination metadata
  const pagination: IPage.IPagination = recentPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "recent pagination current page should be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "recent pagination limit should be >= returned data length",
    pagination.limit >= recentPage.data.length,
  );
  TestValidator.predicate(
    "recent pagination records should be >= returned data length",
    pagination.records >= recentPage.data.length,
  );
  TestValidator.predicate(
    "recent pagination pages should be >= 1 when records > 0",
    pagination.records === 0 || pagination.pages >= 1,
  );

  // 6. Assert that both just-created admins are present in recent results
  const recentIds: string[] = recentPage.data.map((admin) => admin.id);

  TestValidator.predicate(
    "baseline admin must be included in recent activity window",
    recentIds.includes(baselineAdmin.id),
  );
  TestValidator.predicate(
    "secondary admin must be included in recent activity window",
    recentIds.includes(secondaryAdmin.id),
  );

  // Optional: verify sorting by created_at descending as a proxy for lastActiveAt
  if (recentPage.data.length >= 2) {
    const isSortedDesc = recentPage.data.every((admin, index, array) => {
      if (index === 0) return true;
      const prev = new Date(array[index - 1].created_at).getTime();
      const curr = new Date(admin.created_at).getTime();
      return prev >= curr;
    });

    TestValidator.predicate(
      "recent results should be sorted by created_at descending (proxy for lastActiveAt)",
      isSortedDesc,
    );
  }

  // 7. Build an old activity window (far in the past)
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const fromOld: string = new Date(now.getTime() - threeDaysMs).toISOString();
  const toOld: string = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const oldRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    statusIds: undefined,
    createdFrom: null,
    createdTo: null,
    lastActiveFrom: fromOld,
    lastActiveTo: toOld,
    sortBy: "lastActiveAt",
    sortDirection: "desc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const oldPage: IPageICommunityPlatformPlatformadmin.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      {
        body: oldRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadmin.ISummary>(oldPage);

  const oldIds: string[] = oldPage.data.map((admin) => admin.id);

  TestValidator.predicate(
    "baseline admin must not be included in old activity window",
    !oldIds.includes(baselineAdmin.id),
  );
  TestValidator.predicate(
    "secondary admin must not be included in old activity window",
    !oldIds.includes(secondaryAdmin.id),
  );
}
