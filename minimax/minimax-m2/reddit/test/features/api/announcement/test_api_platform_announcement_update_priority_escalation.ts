import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator escalating announcement priority and changing
 * announcement type for urgent communications. This scenario validates
 * emergency communication escalation through announcement updates.
 */
export async function test_api_platform_announcement_update_priority_escalation(
  connection: api.IConnection,
) {
  // 1. Platform Administrator Setup - Create authenticated administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: "TestAdmin123!",
        display_name: "Test Administrator",
        administrator_level: "admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Initial Announcement Creation - Create low-priority info announcement
  const initialAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.create(
      connection,
      {
        body: {
          title: "System Maintenance Scheduled",
          content:
            "Routine system maintenance will be performed next week. Services may be temporarily unavailable during the scheduled maintenance window.",
          announcement_type: "info",
          target_audience: "all_users",
          priority: 2, // Low priority
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days from now
        } satisfies IRedditPlatformAnnouncement.ICreate,
      },
    );
  typia.assert(initialAnnouncement);

  // Validate initial announcement properties
  TestValidator.equals(
    "initial announcement type should be info",
    initialAnnouncement.announcement_type,
    "info",
  );
  TestValidator.equals(
    "initial announcement priority should be low",
    initialAnnouncement.priority,
    2,
  );
  TestValidator.equals(
    "initial announcement should be active",
    initialAnnouncement.is_active,
    true,
  );

  // 3. Priority Escalation Process - Update announcement to high-priority warning
  const updatedAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.update(
      connection,
      {
        announcementId: initialAnnouncement.id,
        body: {
          title: "URGENT: System Maintenance Postponed",
          content:
            "EMERGENCY UPDATE: Scheduled system maintenance has been POSTPONED due to critical security updates. All users must complete any pending actions before the new maintenance window begins.",
          announcement_type: "warning",
          target_audience: "all_users",
          priority: 9, // High priority escalation
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 3 days from now
        } satisfies IRedditPlatformAnnouncement.IUpdate,
      },
    );
  typia.assert(updatedAnnouncement);

  // 4. Validation of Changes - Verify priority escalation was properly implemented
  TestValidator.equals(
    "announcement title should be updated",
    updatedAnnouncement.title,
    "URGENT: System Maintenance Postponed",
  );
  TestValidator.equals(
    "announcement type should change from info to warning",
    updatedAnnouncement.announcement_type,
    "warning",
  );
  TestValidator.equals(
    "announcement priority should be escalated from 2 to 9",
    updatedAnnouncement.priority,
    9,
  );
  TestValidator.equals(
    "announcement should remain active",
    updatedAnnouncement.is_active,
    true,
  );
  TestValidator.equals(
    "announcement target audience should remain all_users",
    updatedAnnouncement.target_audience,
    "all_users",
  );

  // Verify that the escalation is reflected in system ordering
  TestValidator.predicate(
    "high priority should be significantly increased",
    updatedAnnouncement.priority >= 8,
  );
  TestValidator.predicate(
    "announcement type should indicate urgency",
    updatedAnnouncement.announcement_type === "warning",
  );

  // Additional validation for emergency communication protocols
  TestValidator.predicate(
    "content should reflect emergency nature",
    updatedAnnouncement.content.includes("EMERGENCY") ||
      updatedAnnouncement.content.includes("URGENT"),
  );
  TestValidator.predicate(
    "announcement should have shorter duration for urgency",
    new Date(updatedAnnouncement.end_date!).getTime() -
      new Date(updatedAnnouncement.start_date).getTime() <
      new Date(initialAnnouncement.end_date!).getTime() -
        new Date(initialAnnouncement.start_date).getTime(),
  );
}
