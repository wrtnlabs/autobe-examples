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

export async function test_api_maintenance_window_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(admin);
  // Test 1: Text search on title with partial matching
  const partialTitleSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          title: "System",
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(partialTitleSearch);
  // Test 2: Filter by maintenance type
  const maintenanceTypes = [
    "planned",
    "emergency",
    "security",
    "performance",
  ] as const;
  for (const maintenanceType of maintenanceTypes) {
    const typeSearch =
      await api.functional.communityPlatform.admin.maintenance_windows.index(
        adminConnection,
        {
          body: {
            maintenance_type: maintenanceType,
          } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
        },
      );
    typia.assert(typeSearch);
  }
  // Test 3: Filter by status
  const statusTypes = [
    "scheduled",
    "active",
    "completed",
    "cancelled",
  ] as const;
  for (const status of statusTypes) {
    const statusSearch =
      await api.functional.communityPlatform.admin.maintenance_windows.index(
        adminConnection,
        {
          body: {
            status: status,
          } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
        },
      );
    typia.assert(statusSearch);
  }
  // Test 4: Filter by impact level
  const impactLevels = ["low", "medium", "high", "critical"] as const;
  for (const impactLevel of impactLevels) {
    const impactSearch =
      await api.functional.communityPlatform.admin.maintenance_windows.index(
        adminConnection,
        {
          body: {
            impact_level: impactLevel,
          } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
        },
      );
    typia.assert(impactSearch);
  }
  // Test 5: Date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days later
  const dateRangeSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          scheduled_start: pastDate.toISOString(),
          scheduled_end: futureDate.toISOString(),
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test 6: Compound filter - maintenance type + status
  const compoundSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          maintenance_type: "planned",
          status: "scheduled",
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(compoundSearch);
  // Test 7: Non-existent text search
  const nonExistentSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          title: "NON_EXISTENT_TITLE_XYZ123",
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(nonExistentSearch);
  // Test 8: Future date range
  const distantFuture = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365); // 1 year later
  const futureRangeSearch =
    await api.functional.communityPlatform.admin.maintenance_windows.index(
      adminConnection,
      {
        body: {
          scheduled_start: futureDate.toISOString(),
          scheduled_end: distantFuture.toISOString(),
        } satisfies ICommunityPlatformMaintenanceWindow.IRequest,
      },
    );
  typia.assert(futureRangeSearch);
}
