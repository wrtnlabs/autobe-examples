import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganizationSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering organization snapshots by date range and search criteria.
 *
 * Validates the organization snapshot filtering functionality with various filter combinations including date range, search term, and currency code. Ensures that the API correctly filters snapshots based on multiple criteria and returns accurate pagination metadata reflecting the filtered result set.
 *
 * Special attention is given to verifying that date range filters work correctly with ISO 8601 timestamps, search performs case-insensitive partial matching on organization name and description, and currency filtering restricts results to specific ISO currency codes.
 *
 * 1. Authenticate as a member user by registering with valid email and password
 * 2. Test filtering with date range only (created_at_start and created_at_end)
 * 3. Test filtering with search term only (organization name or description)
 * 4. Test filtering with currency only (ISO currency code)
 * 5. Test filtering with multiple criteria combined
 * 6. Verify pagination metadata reflects filtered result count
 * 7. Verify snapshots are sorted by created_at descending
 */
export async function test_api_organization_snapshot_filter_by_date_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Test filtering with date range only (last 7 days)
  const dateRangeFilter = {
    page: 1,
    limit: 10,
    created_at_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_end: new Date().toISOString(),
  } satisfies IHrmTimeTrackOrganizationSnapshot.IRequest;
  const dateRangeResult =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range pagination limit",
    dateRangeResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "date range current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate("date range results within filter period", () => {
    const startDate = new Date(dateRangeFilter.created_at_start!).getTime();
    const endDate = new Date(dateRangeFilter.created_at_end!).getTime();
    return dateRangeResult.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.created_at).getTime();
      return snapshotDate >= startDate && snapshotDate <= endDate;
    });
  });
  TestValidator.predicate("date range results sorted descending", () => {
    if (dateRangeResult.data.length <= 1) return true;
    for (let i = 1; i < dateRangeResult.data.length; i++) {
      if (
        new Date(dateRangeResult.data[i].created_at).getTime() >
        new Date(dateRangeResult.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 3. Test filtering with search term only (common character "a")
  const searchFilter = {
    page: 1,
    limit: 20,
    search: "a",
  } satisfies IHrmTimeTrackOrganizationSnapshot.IRequest;
  const searchResult =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      { body: searchFilter },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search pagination limit",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "search current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate("search results match term", () => {
    if (searchResult.data.length === 0) return true;
    return searchResult.data.every((snapshot) => {
      const searchLower = searchFilter.search!.toLowerCase();
      return (
        snapshot.name.toLowerCase().includes(searchLower) ||
        (snapshot.description &&
          snapshot.description.toLowerCase().includes(searchLower))
      );
    });
  });
  // 4. Test filtering with currency only (USD)
  const currencyFilter = {
    page: 1,
    limit: 15,
    currency: "USD",
  } satisfies IHrmTimeTrackOrganizationSnapshot.IRequest;
  const currencyResult =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      { body: currencyFilter },
    );
  typia.assert(currencyResult);
  TestValidator.equals(
    "currency pagination limit",
    currencyResult.pagination.limit,
    15,
  );
  TestValidator.equals(
    "currency current page",
    currencyResult.pagination.current,
    1,
  );
  TestValidator.predicate("currency results match filter", () => {
    if (currencyResult.data.length === 0) return true;
    return currencyResult.data.every((snapshot) => snapshot.currency === "USD");
  });
  // 5. Test filtering with multiple criteria combined
  const combinedFilter = {
    page: 1,
    limit: 50,
    created_at_start: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_end: new Date().toISOString(),
    search: "test",
    currency: "EUR",
  } satisfies IHrmTimeTrackOrganizationSnapshot.IRequest;
  const combinedResult =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined pagination limit",
    combinedResult.pagination.limit,
    50,
  );
  TestValidator.equals(
    "combined pagination current page",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.predicate("combined results within date range", () => {
    if (combinedResult.data.length === 0) return true;
    const startDate = new Date(combinedFilter.created_at_start!).getTime();
    const endDate = new Date(combinedFilter.created_at_end!).getTime();
    return combinedResult.data.every((snapshot) => {
      const snapshotDate = new Date(snapshot.created_at).getTime();
      return snapshotDate >= startDate && snapshotDate <= endDate;
    });
  });
  TestValidator.predicate("combined results match currency", () => {
    if (combinedResult.data.length === 0) return true;
    return combinedResult.data.every((snapshot) => snapshot.currency === "EUR");
  });
  TestValidator.predicate("combined results sorted descending", () => {
    if (combinedResult.data.length <= 1) return true;
    for (let i = 1; i < combinedResult.data.length; i++) {
      if (
        new Date(combinedResult.data[i].created_at).getTime() >
        new Date(combinedResult.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 6. Verify pagination metadata is consistent
  TestValidator.predicate("all pagination records >= data length", () => {
    return (
      dateRangeResult.pagination.records >= dateRangeResult.data.length &&
      searchResult.pagination.records >= searchResult.data.length &&
      currencyResult.pagination.records >= currencyResult.data.length &&
      combinedResult.pagination.records >= combinedResult.data.length
    );
  });
  TestValidator.predicate("all pagination pages are non-negative", () => {
    return (
      dateRangeResult.pagination.pages >= 0 &&
      searchResult.pagination.pages >= 0 &&
      currencyResult.pagination.pages >= 0 &&
      combinedResult.pagination.pages >= 0
    );
  });
  // 7. Test empty result scenario with restrictive filters
  const restrictiveFilter = {
    page: 1,
    limit: 10,
    created_at_start: new Date("2020-01-01T00:00:00Z").toISOString(),
    created_at_end: new Date("2020-01-02T00:00:00Z").toISOString(),
    search: "xyznonexistent123",
    currency: "XXX",
  } satisfies IHrmTimeTrackOrganizationSnapshot.IRequest;
  const emptyResult =
    await api.functional.hrmTimeTrack.member.organization_snapshots.index(
      memberConnection,
      { body: restrictiveFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result pagination limit",
    emptyResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty result pagination current",
    emptyResult.pagination.current,
    1,
  );
}
