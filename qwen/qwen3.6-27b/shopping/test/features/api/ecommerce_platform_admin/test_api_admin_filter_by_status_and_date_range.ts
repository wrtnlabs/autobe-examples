import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering administrator accounts by ban status and creation date ranges.
 *
 * Validates the administrator listing endpoint supports filtering by ban status and creation date ranges. Tests individual filters for retrieving only banned or only active administrators, then verifies date range queries using createdAtGte and createdAtLte parameters return the correct subsets.
 *
 * Combined filtering scenarios are tested to ensure multiple filter criteria can be applied simultaneously. The default sort order is confirmed to be created_at descending when no explicit sort parameter is provided.
 *
 * 1. Query all administrators without filters to establish baseline data.
 * 2. Filter by isBanned=true to retrieve only banned administrators.
 * 3. Filter by isBanned=false to retrieve only active administrators.
 * 4. Test date range filtering with createdAtGte and createdAtLte parameters.
 * 5. Combine isBanned filter with date range filters simultaneously.
 * 6. Verify default sorting orders results by created_at in descending order.
 */
export async function test_api_admin_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Query all administrators to establish baseline
  const allAdminsResponse = await api.functional.ecommercePlatform.admins.index(
    adminConnection,
    {
      body: {} satisfies IEcommercePlatformAdmin.IRequest,
    },
  );
  typia.assert(allAdminsResponse);
  const allAdmins = allAdminsResponse.data;
  // 6. Verify default sorting is created_at DESC
  for (let i = 1; i < allAdmins.length; i++) {
    TestValidator.predicate(
      "default sort is created_at descending",
      allAdmins[i - 1].created_at >= allAdmins[i].created_at,
    );
  }
  // 2. Filter by isBanned=true
  const bannedRequest = {
    isBanned: true,
  } satisfies IEcommercePlatformAdmin.IRequest;
  const bannedResponse = await api.functional.ecommercePlatform.admins.index(
    adminConnection,
    { body: bannedRequest },
  );
  typia.assert(bannedResponse);
  TestValidator.equals(
    "isBanned=true record count",
    bannedResponse.data.length,
    bannedResponse.pagination.records,
  );
  for (const admin of bannedResponse.data) {
    TestValidator.predicate(`${admin.id} is banned`, admin.is_banned === true);
  }
  // 3. Filter by isBanned=false
  const activeRequest = {
    isBanned: false,
  } satisfies IEcommercePlatformAdmin.IRequest;
  const activeResponse = await api.functional.ecommercePlatform.admins.index(
    adminConnection,
    { body: activeRequest },
  );
  typia.assert(activeResponse);
  TestValidator.equals(
    "isBanned=false record count",
    activeResponse.data.length,
    activeResponse.pagination.records,
  );
  for (const admin of activeResponse.data) {
    TestValidator.predicate(`${admin.id} is active`, admin.is_banned === false);
  }
  TestValidator.equals(
    "banned + active equals total",
    bannedResponse.pagination.records + activeResponse.pagination.records,
    allAdminsResponse.pagination.records,
  );
  // 4. Test date range filtering with narrowed range
  if (allAdmins.length >= 2) {
    const sortedByDate = [...allAdmins].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const midIndex = Math.floor(sortedByDate.length / 2);
    const fromDate = sortedByDate[1].created_at;
    const toDate = sortedByDate[midIndex].created_at;
    const dateRangeRequest = {
      createdAtGte: fromDate,
      createdAtLte: toDate,
    } satisfies IEcommercePlatformAdmin.IRequest;
    const dateRangeResponse =
      await api.functional.ecommercePlatform.admins.index(adminConnection, {
        body: dateRangeRequest,
      });
    typia.assert(dateRangeResponse);
    TestValidator.equals(
      "date range record count",
      dateRangeResponse.data.length,
      dateRangeResponse.pagination.records,
    );
    TestValidator.predicate(
      "date range returns subset",
      dateRangeResponse.pagination.records <=
        allAdminsResponse.pagination.records,
    );
    for (const admin of dateRangeResponse.data) {
      TestValidator.predicate(
        `${admin.id} within date range start`,
        admin.created_at >= fromDate,
      );
      TestValidator.predicate(
        `${admin.id} within date range end`,
        admin.created_at <= toDate,
      );
    }
  }
  // 5. Combined filter: isBanned + date range
  if (allAdmins.length > 0) {
    const firstAdmin = allAdmins[0];
    const now = new Date().toISOString();
    const pastDate = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const combinedRequest = {
      isBanned: firstAdmin.is_banned,
      createdAtGte: pastDate,
      createdAtLte: now,
    } satisfies IEcommercePlatformAdmin.IRequest;
    const combinedResponse =
      await api.functional.ecommercePlatform.admins.index(adminConnection, {
        body: combinedRequest,
      });
    typia.assert(combinedResponse);
    TestValidator.equals(
      "combined filter record count",
      combinedResponse.data.length,
      combinedResponse.pagination.records,
    );
    for (const admin of combinedResponse.data) {
      TestValidator.predicate(
        `${admin.id} matches ban status`,
        admin.is_banned === firstAdmin.is_banned,
      );
      TestValidator.predicate(
        `${admin.id} within combined date range`,
        admin.created_at >= pastDate && admin.created_at <= now,
      );
    }
  }
}
