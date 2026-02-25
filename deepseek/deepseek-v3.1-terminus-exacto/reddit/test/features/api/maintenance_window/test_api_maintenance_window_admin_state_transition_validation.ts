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

/**
 * Test maintenance window state transition validation business logic.
 * According to specification, completed maintenance windows cannot be updated.
 * Tests state transitions and time validation constraints.
 */
export async function test_api_maintenance_window_admin_state_transition_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create scheduled maintenance window
  const maintenanceWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          maintenance_type: "planned",
          scheduled_start: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          scheduled_end: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
          notification_message: RandomGenerator.content({ paragraphs: 1 }),
          impact_level: "low",
          affected_services: "api,database",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // 3. Update status to completed
  const completedWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.update(
      adminConnection,
      {
        maintenanceWindowId: maintenanceWindow.id,
        body: {
          status: "completed",
          // Note: actual_start and actual_end are not allowed in IUpdate type
          // These fields are tracked by the system when status changes
        } satisfies ICommunityPlatformMaintenanceWindow.IUpdate,
      },
    );
  typia.assert(completedWindow);
  // 4. Attempt to update completed maintenance window (invalid state transition)
  await TestValidator.error(
    "cannot update completed maintenance window status",
    async () => {
      await api.functional.communityPlatform.admin.maintenance_windows.update(
        adminConnection,
        {
          maintenanceWindowId: completedWindow.id,
          body: {
            status: "active",
          } satisfies ICommunityPlatformMaintenanceWindow.IUpdate,
        },
      );
    },
  );
  // 5. Test that completed windows reject ANY update
  await TestValidator.error(
    "cannot update any property of completed maintenance window",
    async () => {
      await api.functional.communityPlatform.admin.maintenance_windows.update(
        adminConnection,
        {
          maintenanceWindowId: completedWindow.id,
          body: {
            title: "Updated Title",
            description: "Updated description",
          } satisfies ICommunityPlatformMaintenanceWindow.IUpdate,
        },
      );
    },
  );
  // 6. Test time validation during update (scheduled_end before scheduled_start)
  const validWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          maintenance_type: "planned",
          scheduled_start: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          scheduled_end: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
          notification_message: RandomGenerator.content({ paragraphs: 1 }),
          impact_level: "low",
          affected_services: "api,database",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(validWindow);
  await TestValidator.error(
    "cannot update with invalid time range",
    async () => {
      await api.functional.communityPlatform.admin.maintenance_windows.update(
        adminConnection,
        {
          maintenanceWindowId: validWindow.id,
          body: {
            scheduled_start: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
            scheduled_end: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now (invalid)
          } satisfies ICommunityPlatformMaintenanceWindow.IUpdate,
        },
      );
    },
  );
}