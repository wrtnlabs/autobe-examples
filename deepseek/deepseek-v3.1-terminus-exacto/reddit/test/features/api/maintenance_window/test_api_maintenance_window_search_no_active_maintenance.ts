import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMaintenanceWindow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test maintenance window search functionality with various filter criteria
 * that should return empty results to verify proper handling of empty result sets.
 */
export async function test_api_maintenance_window_search_no_active_maintenance(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Search for active maintenance windows when none exist
  const activeSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(activeSearch);
  TestValidator.equals(
    "active search records count",
    activeSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "active search pages count",
    activeSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "active search data array empty",
    activeSearch.data.length,
    0,
  );
  // Test 2: Search for emergency maintenance windows when none exist
  const emergencySearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          maintenance_type: "emergency",
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(emergencySearch);
  TestValidator.equals(
    "emergency search records count",
    emergencySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "emergency search pages count",
    emergencySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "emergency search data array empty",
    emergencySearch.data.length,
    0,
  );
  // Test 3: Search for maintenance windows scheduled far in the future
  const futureDate = new Date(
    Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time"> as string &
    tags.Format<"date-time">;
  const futureSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          scheduled_start: futureDate,
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(futureSearch);
  TestValidator.equals(
    "future search records count",
    futureSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "future search pages count",
    futureSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future search data array empty",
    futureSearch.data.length,
    0,
  );
  // Test 4: Search for a specific title that doesn't exist
  const titleSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          title: "nonexistent-maintenance-title-12345",
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(titleSearch);
  TestValidator.equals(
    "title search records count",
    titleSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "title search pages count",
    titleSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "title search data array empty",
    titleSearch.data.length,
    0,
  );
  // Test 5: Test default pagination with zero records
  const defaultSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          page: 1,
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search current page",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default search limit positive",
    defaultSearch.pagination.limit > 0,
  );
  TestValidator.equals(
    "default search records count",
    defaultSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "default search pages count",
    defaultSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default search data array empty",
    defaultSearch.data.length,
    0,
  );
}
