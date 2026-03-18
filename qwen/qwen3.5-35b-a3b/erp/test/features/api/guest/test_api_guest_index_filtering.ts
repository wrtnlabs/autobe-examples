import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_index_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin connection for accessing guest list
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Get initial list to have existing guests for fingerprint test
  const initialList = await api.functional.hrms.guests.index(adminConnection, {
    body: {
      page: 1,
      limit: 100,
    },
  });
  typia.assert(initialList);
  // Store a device fingerprint for partial match test
  const testFingerprint =
    initialList.data.length > 0
      ? initialList.data[0].device_fingerprint.substring(0, 10)
      : "";
  // Test 1: Basic query with no filters (should return all guests with pagination)
  const basicResponse = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
        order: "desc",
      },
    },
  );
  typia.assert(basicResponse);
  TestValidator.predicate(
    "basic query returns page info",
    !!basicResponse.pagination,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    basicResponse.pagination.records >= 0,
  );
  // Test 2: Test createdAfter filter (guests created after specific date)
  const pastDate = new Date(
    new Date().getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAfterFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        createdAfter: pastDate,
      },
    },
  );
  typia.assert(createdAfterFilter);
  TestValidator.equals(
    "createdAfter filter applies to response",
    createdAfterFilter.data.every(
      (guest: IHrmsGuest.ISummary) => guest.created_at >= pastDate,
    ),
    true,
  );
  // Test 3: Test createdBefore filter (guests created before specific date)
  const futureDate = new Date(
    new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdBeforeFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        createdBefore: futureDate,
      },
    },
  );
  typia.assert(createdBeforeFilter);
  TestValidator.equals(
    "createdBefore filter applies to response",
    createdBeforeFilter.data.every(
      (guest: IHrmsGuest.ISummary) => guest.created_at <= futureDate,
    ),
    true,
  );
  // Test 4: Test date range filter (createdAfter + createdBefore)
  const dateRangeFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        createdAfter: pastDate,
        createdBefore: futureDate,
      },
    },
  );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range filter applies to response",
    dateRangeFilter.data.every(
      (guest: IHrmsGuest.ISummary) =>
        guest.created_at >= pastDate && guest.created_at <= futureDate,
    ),
    true,
  );
  // Test 5: Test deviceFingerprint partial match search
  const deviceFingerprintFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        deviceFingerprint: testFingerprint,
      },
    },
  );
  typia.assert(deviceFingerprintFilter);
  if (deviceFingerprintFilter.data.length > 0) {
    TestValidator.equals(
      "deviceFingerprint partial match works",
      deviceFingerprintFilter.data.some((guest: IHrmsGuest.ISummary) =>
        guest.device_fingerprint.includes(testFingerprint),
      ),
      true,
    );
  }
  // Test 6: Test activeOnly filter (activeOnly=true should return valid data)
  const activeOnlyFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        activeOnly: true,
      },
    },
  );
  typia.assert(activeOnlyFilter);
  TestValidator.equals(
    "activeOnly=true returns valid pagination",
    activeOnlyFilter.pagination.current > 0,
    true,
  );
  // Test 7: Test sorting order asc
  const ascSortFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        order: "asc",
      },
    },
  );
  typia.assert(ascSortFilter);
  if (ascSortFilter.data.length > 1) {
    const isSortedAsc = ascSortFilter.data.every(
      (guest: IHrmsGuest.ISummary, index: number) =>
        index === 0 ||
        guest.created_at >= ascSortFilter.data[index - 1].created_at,
    );
    TestValidator.equals("ascending order is correct", isSortedAsc, true);
  }
  // Test 8: Test sorting order desc
  const descSortFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        order: "desc",
      },
    },
  );
  typia.assert(descSortFilter);
  if (descSortFilter.data.length > 1) {
    const isSortedDesc = descSortFilter.data.every(
      (guest: IHrmsGuest.ISummary, index: number) =>
        index === 0 ||
        guest.created_at <= descSortFilter.data[index - 1].created_at,
    );
    TestValidator.equals("descending order is correct", isSortedDesc, true);
  }
  // Test 9: Test combined filters (date range + sorting + activeOnly)
  const combinedFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        createdAfter: pastDate,
        createdBefore: futureDate,
        activeOnly: true,
        order: "desc",
      },
    },
  );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filters work together",
    combinedFilter.data.every(
      (guest: IHrmsGuest.ISummary) =>
        guest.created_at >= pastDate && guest.created_at <= futureDate,
    ),
    true,
  );
  // Test 10: Test pagination works with filters
  const paginatedFilter = await api.functional.hrms.guests.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
        createdAfter: pastDate,
      },
    },
  );
  typia.assert(paginatedFilter);
  TestValidator.equals(
    "pagination respects page and limit",
    paginatedFilter.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination respects current page",
    paginatedFilter.pagination.current,
    2,
  );
}