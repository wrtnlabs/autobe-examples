import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountStatus";

export async function test_api_account_status_index_search_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain authenticated session
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create three deterministic account statuses so we can reason about search and sort
  const activeStatusCreate = {
    key: "ACTIVE",
    label: "Active",
    description: "Standard active account status",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const suspendedTempCreate = {
    key: "SUSPENDED_TEMP",
    label: "Temporarily Suspended",
    description: "Account is temporarily suspended",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const suspendedPermCreate = {
    key: "SUSPENDED_PERM",
    label: "Permanently Suspended",
    description: "Account is permanently suspended",
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const activeStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: activeStatusCreate },
    );
  typia.assert(activeStatus);

  const suspendedTemp: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: suspendedTempCreate },
    );
  typia.assert(suspendedTemp);

  const suspendedPerm: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: suspendedPermCreate },
    );
  typia.assert(suspendedPerm);

  // Helper to assert basic pagination invariants without assuming there are no other rows
  const assertPagination = (
    title: string,
    pagination: IPage.IPagination,
    dataLength: number,
    requestedLimit: number,
    requestedPage: number,
  ) => {
    // limit and current should reflect the requested values (or a sane default)
    TestValidator.predicate(
      `${title} - limit should be positive`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title} - current page should be non-negative`,
      pagination.current >= 0,
    );

    // records should be at least the number of items in this page
    TestValidator.predicate(
      `${title} - records should be >= data length`,
      pagination.records >= dataLength,
    );

    // pages should be consistent with records and limit when limit > 0
    if (pagination.limit > 0 && pagination.records > 0) {
      const minPages = Math.ceil(pagination.records / pagination.limit);
      TestValidator.predicate(
        `${title} - pages should be >= ceil(records/limit)`,
        pagination.pages >= minPages,
      );
    } else {
      TestValidator.predicate(
        `${title} - pages should be >= 0 when no records or zero limit`,
        pagination.pages >= 0,
      );
    }

    // Requested page and limit should not contradict the response
    TestValidator.predicate(
      `${title} - requested limit honored or adjusted sensibly`,
      pagination.limit <= requestedLimit || pagination.limit === requestedLimit,
    );
    TestValidator.predicate(
      `${title} - requested page not greater than reported pages when records exist`,
      pagination.records === 0 || pagination.current <= pagination.pages,
    );
  };

  // We want a limit that is large enough to include at least the three we just created
  const limit = 10;
  const page = 1;

  // 3. Search with term "Suspended" and no explicit sort (server default)
  const searchTerm = "Suspended";

  const searchResponse: IPageICommunityPlatformAccountStatus.ISummary =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
      connection,
      {
        body: {
          page,
          limit,
          search: searchTerm,
        } satisfies ICommunityPlatformAccountStatus.IRequest,
      },
    );
  typia.assert(searchResponse);

  const searchData = searchResponse.data;

  // All returned items should contain the term "Suspended" in either label or description
  for (const item of searchData) {
    const containsInLabel = item.label.includes("Suspended");
    const containsInDescription = item.description.includes("Suspended");
    TestValidator.predicate(
      "search results must contain 'Suspended' in label or description",
      containsInLabel || containsInDescription,
    );
  }

  // Ensure that both specific suspended statuses appear in the search results
  const keysFromSearch = searchData.map((x) => x.key);
  TestValidator.predicate(
    "Temporary suspended status must be included in search results",
    keysFromSearch.includes(suspendedTemp.key),
  );
  TestValidator.predicate(
    "Permanent suspended status must be included in search results",
    keysFromSearch.includes(suspendedPerm.key),
  );

  // ACTIVE should not be in the search results
  TestValidator.predicate(
    "ACTIVE status must be excluded from search results",
    !keysFromSearch.includes(activeStatus.key),
  );

  // Pagination metadata should be internally consistent
  assertPagination(
    "search Suspended default sort",
    searchResponse.pagination,
    searchData.length,
    limit,
    page,
  );

  // 4. Search again with sortBy = "label" and sortDirection = "asc"
  const searchSortedByLabel: IPageICommunityPlatformAccountStatus.ISummary =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
      connection,
      {
        body: {
          page,
          limit,
          search: searchTerm,
          sortBy: "label",
          sortDirection: "asc",
        } satisfies ICommunityPlatformAccountStatus.IRequest,
      },
    );
  typia.assert(searchSortedByLabel);

  const labelSortedData = searchSortedByLabel.data;

  const keysFromLabelSort = labelSortedData.map((x) => x.key);
  TestValidator.predicate(
    "Temporary suspended status must be included when sorting by label",
    keysFromLabelSort.includes(suspendedTemp.key),
  );
  TestValidator.predicate(
    "Permanent suspended status must be included when sorting by label",
    keysFromLabelSort.includes(suspendedPerm.key),
  );
  TestValidator.predicate(
    "ACTIVE status must not be included when sorting by label",
    !keysFromLabelSort.includes(activeStatus.key),
  );

  // Extract suspended-only items and assert lexicographical order by label
  const suspendedItemsByLabel = labelSortedData.filter((item) =>
    [suspendedPerm.key, suspendedTemp.key].includes(item.key),
  );

  if (suspendedItemsByLabel.length >= 2) {
    const labels = suspendedItemsByLabel.map((x) => x.label);
    const manuallySorted = [...labels].sort((a, b) => a.localeCompare(b));
    TestValidator.equals(
      "suspended statuses must be ordered lexicographically by label (asc)",
      labels,
      manuallySorted,
    );
  }

  // Pagination metadata should remain consistent
  assertPagination(
    "search Suspended sort by label asc",
    searchSortedByLabel.pagination,
    labelSortedData.length,
    limit,
    page,
  );

  // 5. Search again with sortBy = "createdAt" and sortDirection = "desc"
  const searchSortedByCreatedAt: IPageICommunityPlatformAccountStatus.ISummary =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
      connection,
      {
        body: {
          page,
          limit,
          search: searchTerm,
          sortBy: "createdAt",
          sortDirection: "desc",
        } satisfies ICommunityPlatformAccountStatus.IRequest,
      },
    );
  typia.assert(searchSortedByCreatedAt);

  const createdAtSortedData = searchSortedByCreatedAt.data;

  const keysFromCreatedAtSort = createdAtSortedData.map((x) => x.key);
  TestValidator.predicate(
    "Temporary suspended status must be included when sorting by createdAt",
    keysFromCreatedAtSort.includes(suspendedTemp.key),
  );
  TestValidator.predicate(
    "Permanent suspended status must be included when sorting by createdAt",
    keysFromCreatedAtSort.includes(suspendedPerm.key),
  );
  TestValidator.predicate(
    "ACTIVE status must not be included when sorting by createdAt",
    !keysFromCreatedAtSort.includes(activeStatus.key),
  );

  // Determine which suspended status is newer based on full entity createdAt
  const suspendedNewerFirst: ICommunityPlatformAccountStatus[] = [
    suspendedTemp,
    suspendedPerm,
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const newerKey = suspendedNewerFirst[0]?.key;
  const olderKey = suspendedNewerFirst[1]?.key;

  // Filter suspended items from the createdAt-sorted summaries
  const suspendedItemsByCreatedAt = createdAtSortedData.filter((item) =>
    [suspendedPerm.key, suspendedTemp.key].includes(item.key),
  );

  if (suspendedItemsByCreatedAt.length >= 2 && newerKey && olderKey) {
    // We expect the first suspended item to correspond to the newer entity
    const firstSuspended = suspendedItemsByCreatedAt[0];
    TestValidator.equals(
      "newer suspended status must appear before older one when sorting by createdAt desc",
      firstSuspended.key,
      newerKey,
    );
  }

  // Pagination metadata must remain correct
  assertPagination(
    "search Suspended sort by createdAt desc",
    searchSortedByCreatedAt.pagination,
    createdAtSortedData.length,
    limit,
    page,
  );
}
