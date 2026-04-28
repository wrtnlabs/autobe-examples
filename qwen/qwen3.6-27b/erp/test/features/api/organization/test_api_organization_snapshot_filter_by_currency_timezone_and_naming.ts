import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_platform_organizations_create } from "../../../generate/generate_random_hrm_platform_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test filtering organization configuration snapshots by currency, timezone, and name.
 *
 * Validates that the organization snapshots endpoint correctly filters historical configuration records by currency code, timezone identifier, organization name (partial case-insensitive), and acting member ID. Verifies that pagination metadata accurately reflects the count of filtered results.
 *
 * Special attention is given to testing that non-matching filter values return empty result sets with zero records, and that the currency and timezone filters use exact matching while name uses partial case-insensitive matching.
 *
 * 1. Create organization with specific currency (USD), timezone (America/New_York), and name (TestOrganizationAcme).
 * 2. Query all snapshots to verify creation auto-generates a configuration snapshot.
 * 3. Filter by currency=USD - returns matching snapshots.
 * 4. Filter by currency=EUR - returns empty result set.
 * 5. Filter by timezone=America/New_York - returns matching snapshots.
 * 6. Filter by timezone=Asia/Seoul - returns empty result set.
 * 7. Filter by name=acme (partial, case-insensitive) - returns matching snapshots.
 * 8. Test combined currency and timezone filters.
 * 9. Verify pagination records count for each filter combination.
 */
export async function test_api_organization_snapshot_filter_by_currency_timezone_and_naming(
  connection: api.IConnection,
) {
  // 1. Setup - create organization with known configuration
  const userConnection: api.IConnection = { host: connection.host };
  const organization = await generate_random_hrm_platform_organizations_create(
    userConnection,
    {
      body: {
        name: "TestOrganizationAcme",
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // 2. Query all snapshots (no filters) to verify snapshot was auto-created
  const allSnapshots =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      { organizationId: organization.id, body: {} },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "has at least one snapshot",
    allSnapshots.data.length > 0,
  );
  // 3. Test currency filter - matching USD
  const currencyUsd =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          currency: "USD",
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(currencyUsd);
  TestValidator.predicate(
    "currency USD filter returns results",
    currencyUsd.data.length > 0,
  );
  TestValidator.equals(
    "currency USD records count matches data length",
    currencyUsd.pagination.records,
    currencyUsd.data.length,
  );
  // Verify all returned snapshots have USD currency
  await ArrayUtil.asyncForEach(currencyUsd.data, async (snapshot) => {
    TestValidator.equals("snapshot has USD currency", snapshot.currency, "USD");
  });
  // 4. Test currency filter - non-matching EUR
  const currencyEur =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          currency: "EUR",
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(currencyEur);
  TestValidator.equals(
    "currency EUR filter returns zero records",
    currencyEur.pagination.records,
    0,
  );
  TestValidator.equals(
    "currency EUR data array is empty",
    currencyEur.data.length,
    0,
  );
  // 5. Test timezone filter - matching America/New_York
  const timezoneNy =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          timezone: "America/New_York",
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(timezoneNy);
  TestValidator.predicate(
    "timezone America/New_York filter returns results",
    timezoneNy.data.length > 0,
  );
  // 6. Test timezone filter - non-matching Asia/Seoul
  const timezoneSeoul =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          timezone: "Asia/Seoul",
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(timezoneSeoul);
  TestValidator.equals(
    "timezone Asia/Seoul filter returns zero records",
    timezoneSeoul.pagination.records,
    0,
  );
  // 7. Test name filter - partial, case-insensitive match
  const nameFilter =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          name: "acme",
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(nameFilter);
  TestValidator.predicate(
    "name partial case-insensitive filter returns results",
    nameFilter.data.length > 0,
  );
  TestValidator.equals(
    "name filter records count matches data length",
    nameFilter.pagination.records,
    nameFilter.data.length,
  );
  // Verify name matches using case-insensitive partial match
  await ArrayUtil.asyncForEach(nameFilter.data, async (snapshot) => {
    TestValidator.predicate(
      "snapshot name contains acme (case-insensitive)",
      snapshot.name.toLowerCase().includes("acme"),
    );
  });
  // 8. Test combined filters (currency + timezone)
  const combinedFilter =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          currency: "USD",
          timezone: "America/New_York",
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined currency and timezone filter returns results",
    combinedFilter.data.length > 0,
  );
  TestValidator.equals(
    "combined filter records count matches data length",
    combinedFilter.pagination.records,
    combinedFilter.data.length,
  );
  // 9. Test pagination with limit on filtered results
  const paginatedFilter =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: {
          currency: "USD",
          limit: 1,
        } satisfies IHrmPlatformOrganizationSnapshot.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  TestValidator.equals(
    "paginated result limit is 1",
    paginatedFilter.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paginated records count reflects total filter results",
    paginatedFilter.pagination.records >= 1,
  );
}
