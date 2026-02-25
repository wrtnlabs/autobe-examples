import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_snapshots_search_with_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Step 2: Generate a configuration ID for testing
  const configId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Define date range for filtering
  // Create a base date to work with
  const baseDate = new Date();
  // Define date range boundaries:
  // - startDateMin: Oldest allowed date (10 days ago)
  // - startDateMax: Newest allowed date (5 days ago)
  const tenDaysAgo = new Date(baseDate);
  tenDaysAgo.setDate(baseDate.getDate() - 10);
  const fiveDaysAgo = new Date(baseDate);
  fiveDaysAgo.setDate(baseDate.getDate() - 5);
  // Convert to ISO strings for API request (matching API parameter semantics)
  const suspensionStartDateMin = tenDaysAgo.toISOString(); // Minimum (earliest) date
  const suspensionStartDateMax = fiveDaysAgo.toISOString(); // Maximum (latest) date
  // Step 4: Perform search with comprehensive date range filtering
  const searchResults =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_start_date_min: suspensionStartDateMin,
          suspension_start_date_max: suspensionStartDateMax,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
          status: "active" as const,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults);
  // Step 5: Validate pagination structure
  TestValidator.equals(
    "pagination object present",
    searchResults.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is 1",
    searchResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count matches data length",
    searchResults.pagination.records >= searchResults.data.length,
  );
  // Step 6: Validate each snapshot is within date range
  const minDate = new Date(suspensionStartDateMin); // Oldest allowed
  const maxDate = new Date(suspensionStartDateMax); // Newest allowed
  for (const snapshot of searchResults.data) {
    const snapshotDate = new Date(snapshot.suspension_start_date);
    // Validate snapshot is within range: minDate <= snapshotDate <= maxDate
    TestValidator.predicate(
      `snapshot ${snapshot.id} date >= min date`,
      snapshotDate >= minDate,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} date <= max date`,
      snapshotDate <= maxDate,
    );
    // Validate snapshot has "active" status (as filtered)
    TestValidator.equals(
      `snapshot ${snapshot.id} has active status`,
      snapshot.status,
      "active",
    );
    // Validate complete snapshot structure
    typia.assert(snapshot);
    typia.assert(snapshot.seller);
    typia.assert(snapshot.administrator);
  }
  // Step 7: Test error case - invalid date range (min > max)
  await TestValidator.error(
    "should reject invalid date range (min > max)",
    async () => {
      await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
        adminConnection,
        {
          configId,
          body: {
            suspension_start_date_min: suspensionStartDateMax, // Newer date as min
            suspension_start_date_max: suspensionStartDateMin, // Older date as max
            page: 1,
            limit: 10,
          } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
        },
      );
    },
  );
  // Step 8: Test edge case - very narrow date range
  const narrowMinDate = new Date(baseDate);
  narrowMinDate.setDate(baseDate.getDate() - 7);
  const narrowMaxDate = new Date(narrowMinDate);
  narrowMaxDate.setHours(narrowMinDate.getHours() + 1); // 1 hour range
  const narrowResults =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_start_date_min: narrowMinDate.toISOString(),
          suspension_start_date_max: narrowMaxDate.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(narrowResults);
  // Validate narrow range results
  for (const snapshot of narrowResults.data) {
    const snapshotDate = new Date(snapshot.suspension_start_date);
    const narrowMin = new Date(narrowMinDate);
    const narrowMax = new Date(narrowMaxDate);
    TestValidator.predicate(
      `snapshot ${snapshot.id} within narrow range`,
      snapshotDate >= narrowMin && snapshotDate <= narrowMax,
    );
  }
  // Note: This test validates comprehensive date range filtering for cache configuration snapshots,
  // including proper pagination, boundary conditions, and error handling for invalid ranges.
}
