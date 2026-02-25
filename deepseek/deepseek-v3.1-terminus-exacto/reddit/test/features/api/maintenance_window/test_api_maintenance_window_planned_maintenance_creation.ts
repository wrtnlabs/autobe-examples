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

export async function test_api_maintenance_window_planned_maintenance_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create maintenance window with planned type and valid scheduling
  const scheduledStart = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // tomorrow
  const scheduledEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // day after tomorrow
  const maintenanceWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          maintenance_type: "planned",
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          notification_message: RandomGenerator.paragraph({ sentences: 3 }),
          impact_level: "medium",
          affected_services: "api,database,frontend",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // Validate response structure and business logic
  TestValidator.equals(
    "status should be scheduled",
    maintenanceWindow.status,
    "scheduled",
  );
  TestValidator.equals(
    "actual_start should be null",
    maintenanceWindow.actual_start,
    null,
  );
  TestValidator.equals(
    "actual_end should be null",
    maintenanceWindow.actual_end,
    null,
  );
  TestValidator.equals(
    "notification_sent_at should be null",
    maintenanceWindow.notification_sent_at,
    null,
  );
  TestValidator.predicate(
    "scheduled_end should be after scheduled_start",
    new Date(maintenanceWindow.scheduled_end) >
      new Date(maintenanceWindow.scheduled_start),
  );
}
