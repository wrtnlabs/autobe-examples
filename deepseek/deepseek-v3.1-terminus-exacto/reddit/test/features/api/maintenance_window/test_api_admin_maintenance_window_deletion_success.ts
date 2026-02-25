import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_maintenance_windows_create } from "../../../generate/generate_random_community_platform_admin_maintenance_windows_create";
import { prepare_random_community_platform_maintenance_window } from "../../../prepare/prepare_random_community_platform_maintenance_window";

export async function test_api_admin_maintenance_window_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a maintenance window to delete
  const maintenanceWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          maintenance_type: "planned",
          scheduled_start: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          scheduled_end: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          notification_message: RandomGenerator.paragraph({ sentences: 3 }),
          impact_level: "low",
          affected_services: "api,database",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // 3. Delete the maintenance window
  await api.functional.communityPlatform.admin.maintenance_windows.erase(
    adminConnection,
    {
      maintenanceWindowId: maintenanceWindow.id,
    },
  );
  // 4. Verify hard deletion by attempting to retrieve the deleted window
  await TestValidator.error(
    "maintenance window should not exist after deletion",
    async () => {
      // Note: Since there's no GET endpoint provided in the SDK functions,
      // we'll attempt to delete the same window again which should fail with 404
      await api.functional.communityPlatform.admin.maintenance_windows.erase(
        adminConnection,
        {
          maintenanceWindowId: maintenanceWindow.id,
        },
      );
    },
  );
}
