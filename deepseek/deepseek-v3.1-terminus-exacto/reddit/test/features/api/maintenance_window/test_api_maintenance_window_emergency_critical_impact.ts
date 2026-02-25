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
 * Test emergency maintenance window creation with critical impact level.
 * 1. Authenticate as admin using authorize_admin_join utility function
 * 2. Create an emergency maintenance window with critical impact
 * 3. Validate the maintenance window properties including emergency type and critical impact
 * 4. Verify notification message contains urgent language
 */
export async function test_api_maintenance_window_emergency_critical_impact(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create emergency maintenance window
  const maintenanceWindow =
    await generate_random_community_platform_admin_maintenance_windows_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          maintenance_type: "emergency",
          scheduled_start: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 minutes from now
          scheduled_end: new Date(
            Date.now() + 1000 * 60 * 60 * 2,
          ).toISOString(), // 2 hours from now
          notification_message:
            "URGENT: Emergency maintenance required. Platform will be temporarily unavailable. CRITICAL IMPACT: Multiple services affected.",
          impact_level: "critical",
          affected_services:
            "authentication, posting, commenting, voting, messaging",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // 3. Validate maintenance window properties
  TestValidator.equals(
    "maintenance type is emergency",
    maintenanceWindow.maintenance_type,
    "emergency",
  );
  TestValidator.equals(
    "impact level is critical",
    maintenanceWindow.impact_level,
    "critical",
  );
  TestValidator.equals(
    "status is scheduled",
    maintenanceWindow.status,
    "scheduled",
  );
  TestValidator.predicate(
    "notification message contains urgent language",
    maintenanceWindow.notification_message.includes("URGENT"),
  );
  TestValidator.predicate(
    "notification message contains critical impact",
    maintenanceWindow.notification_message.includes("CRITICAL IMPACT"),
  );
  TestValidator.predicate(
    "affected services contains multiple services",
    maintenanceWindow.affected_services.includes(","),
  );
  TestValidator.equals(
    "actual start is null",
    maintenanceWindow.actual_start,
    null,
  );
  TestValidator.equals(
    "actual end is null",
    maintenanceWindow.actual_end,
    null,
  );
  TestValidator.equals(
    "notification sent at is null",
    maintenanceWindow.notification_sent_at,
    null,
  );
}
