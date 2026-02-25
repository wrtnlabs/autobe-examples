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

export async function test_api_maintenance_window_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using join endpoint
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a maintenance window using utility function
  const maintenanceWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          maintenance_type: RandomGenerator.pick([
            "planned",
            "emergency",
            "security",
            "performance",
          ] as const),
          scheduled_start: typia.random<string & tags.Format<"date-time">>(),
          scheduled_end: typia.random<string & tags.Format<"date-time">>(),
          notification_message: RandomGenerator.paragraph({ sentences: 2 }),
          impact_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          affected_services: RandomGenerator.pick([
            "api",
            "database",
            "frontend",
            "all",
          ] as const),
        },
      },
    );
  typia.assert(maintenanceWindow);
  // Retrieve the maintenance window by ID
  const retrievedWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.at(
      adminConnection,
      {
        maintenanceWindowId: maintenanceWindow.id,
      },
    );
  typia.assert(retrievedWindow);
  // Validate all fields match
  TestValidator.equals(
    "maintenance window ID",
    retrievedWindow.id,
    maintenanceWindow.id,
  );
  TestValidator.equals("title", retrievedWindow.title, maintenanceWindow.title);
  TestValidator.equals(
    "description",
    retrievedWindow.description,
    maintenanceWindow.description,
  );
  TestValidator.equals(
    "maintenance type",
    retrievedWindow.maintenance_type,
    maintenanceWindow.maintenance_type,
  );
  TestValidator.equals(
    "scheduled start",
    retrievedWindow.scheduled_start,
    maintenanceWindow.scheduled_start,
  );
  TestValidator.equals(
    "scheduled end",
    retrievedWindow.scheduled_end,
    maintenanceWindow.scheduled_end,
  );
  TestValidator.equals(
    "status",
    retrievedWindow.status,
    maintenanceWindow.status,
  );
  TestValidator.equals(
    "notification message",
    retrievedWindow.notification_message,
    maintenanceWindow.notification_message,
  );
  TestValidator.equals(
    "impact level",
    retrievedWindow.impact_level,
    maintenanceWindow.impact_level,
  );
  TestValidator.equals(
    "affected services",
    retrievedWindow.affected_services,
    maintenanceWindow.affected_services,
  );
  // Validate nullable fields are null for newly created maintenance window
  TestValidator.equals(
    "actual start should be null",
    retrievedWindow.actual_start,
    null,
  );
  TestValidator.equals(
    "actual end should be null",
    retrievedWindow.actual_end,
    null,
  );
  TestValidator.equals(
    "notification sent at should be null",
    retrievedWindow.notification_sent_at,
    null,
  );
  TestValidator.equals(
    "deleted at should be null",
    retrievedWindow.deleted_at,
    null,
  );
  // Validate system-generated timestamps (they should be very close)
  TestValidator.predicate(
    "created at should be valid",
    retrievedWindow.created_at === maintenanceWindow.created_at,
  );
  TestValidator.predicate(
    "updated at should be valid",
    retrievedWindow.updated_at === maintenanceWindow.updated_at,
  );
}
