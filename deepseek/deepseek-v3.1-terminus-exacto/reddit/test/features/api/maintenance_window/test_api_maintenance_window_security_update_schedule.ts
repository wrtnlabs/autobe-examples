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

export async function test_api_maintenance_window_security_update_schedule(
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
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create security maintenance window
  const maintenanceWindow =
    await api.functional.communityPlatform.admin.maintenance_windows.create(
      adminConnection,
      {
        body: {
          title: "Security Vulnerability Patch - Critical Update",
          description:
            "Emergency security maintenance to address critical platform vulnerabilities identified in authentication system and data encryption layers.",
          maintenance_type: "security",
          scheduled_start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          scheduled_end: new Date(Date.now() + 90000000).toISOString(), // 1 hour later
          notification_message:
            "Platform will be temporarily unavailable for security updates. We are patching critical vulnerabilities to ensure your data remains safe.",
          impact_level: "high",
          affected_services:
            "authentication, user-profiles, data-encryption, api-gateway",
        } satisfies ICommunityPlatformMaintenanceWindow.ICreate,
      },
    );
  typia.assert(maintenanceWindow);
  // Validate security maintenance window properties
  TestValidator.equals(
    "maintenance type should be security",
    maintenanceWindow.maintenance_type,
    "security",
  );
  TestValidator.equals(
    "impact level should be high",
    maintenanceWindow.impact_level,
    "high",
  );
  TestValidator.predicate(
    "notification message should contain security terminology",
    maintenanceWindow.notification_message.toLowerCase().includes("security") &&
      maintenanceWindow.notification_message
        .toLowerCase()
        .includes("vulnerability"),
  );
  TestValidator.predicate(
    "affected services should include security-critical components",
    maintenanceWindow.affected_services.includes("authentication") &&
      maintenanceWindow.affected_services.includes("data-encryption"),
  );
  TestValidator.equals(
    "status should be scheduled",
    maintenanceWindow.status,
    "scheduled",
  );
  TestValidator.predicate(
    "scheduled end should be after scheduled start",
    new Date(maintenanceWindow.scheduled_end) >
      new Date(maintenanceWindow.scheduled_start),
  );
}
