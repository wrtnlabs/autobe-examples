import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_metadata_registry_admin_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Test 1: Basic search to ensure API is working
  const basicSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.index(
      adminConnection,
      { body: { page: 1, limit: 5 } },
    );
  typia.assert(basicSearchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    () => basicSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    () =>
      basicSearchResult.pagination.limit >= 1 &&
      basicSearchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    () => basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    () => basicSearchResult.pagination.pages >= 0,
  );
  // Test 2: Partial schema_name matching (if we have data to test with)
  if (basicSearchResult.data.length > 0) {
    const sampleEntry = basicSearchResult.data[0];
    const partialName = sampleEntry.schema_name.substring(
      0,
      Math.min(5, sampleEntry.schema_name.length),
    );
    const partialSearchResult =
      await api.functional.ecommerce.administrator.metadata_registries.index(
        adminConnection,
        { body: { schema_name: partialName, page: 1, limit: 10 } },
      );
    typia.assert(partialSearchResult);
    if (partialSearchResult.data.length > 0) {
      partialSearchResult.data.forEach((entry, index) => {
        TestValidator.predicate(
          `entry ${index} should contain partial schema name`,
          () => entry.schema_name.includes(partialName),
        );
      });
    }
  }
  // Test 3: is_active filtering
  const activeSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.index(
      adminConnection,
      { body: { is_active: true, page: 1, limit: 10 } },
    );
  typia.assert(activeSearchResult);
  if (activeSearchResult.data.length > 0) {
    activeSearchResult.data.forEach((entry, index) => {
      TestValidator.equals(
        `entry ${index} should be active`,
        entry.is_active,
        true,
      );
    });
  }
  // Test 4: Date range filtering
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const dateRangeResult =
    await api.functional.ecommerce.administrator.metadata_registries.index(
      adminConnection,
      {
        body: {
          created_after: oneWeekAgo,
          created_before: now,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateRangeResult);
  if (dateRangeResult.data.length > 0) {
    dateRangeResult.data.forEach((entry, index) => {
      const entryDate = new Date(entry.created_at);
      const afterDate = new Date(oneWeekAgo);
      const beforeDate = new Date(now);
      TestValidator.predicate(
        `entry ${index} should be created after specified date`,
        () => entryDate >= afterDate,
      );
      TestValidator.predicate(
        `entry ${index} should be created before specified date`,
        () => entryDate <= beforeDate,
      );
    });
  }
  // Test 5: Combination of multiple filters
  const combinedFiltersResult =
    await api.functional.ecommerce.administrator.metadata_registries.index(
      adminConnection,
      {
        body: {
          is_active: true,
          created_after: oneWeekAgo,
          created_before: now,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(combinedFiltersResult);
  // Validate combined filter results
  if (combinedFiltersResult.data.length > 0) {
    const afterDate = new Date(oneWeekAgo);
    const beforeDate = new Date(now);
    combinedFiltersResult.data.forEach((entry, index) => {
      TestValidator.equals(
        `combined filter entry ${index} should be active`,
        entry.is_active,
        true,
      );
      const entryDate = new Date(entry.created_at);
      TestValidator.predicate(
        `combined filter entry ${index} should be within date range`,
        () => entryDate >= afterDate && entryDate <= beforeDate,
      );
    });
  }
}
