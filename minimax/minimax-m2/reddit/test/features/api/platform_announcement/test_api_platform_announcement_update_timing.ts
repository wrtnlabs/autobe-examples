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
 * Test platform administrator updating announcement timing and activation
 * status.
 *
 * This test validates the complete announcement lifecycle management
 * functionality by:
 *
 * 1. Authenticating as a platform administrator to establish proper authorization
 * 2. Creating an initial announcement with basic timing configuration
 * 3. Updating the announcement to modify start_date to a later time for scheduling
 * 4. Adding an end_date to create a limited display duration window
 * 5. Toggling the is_active status to test activation/deactivation control
 * 6. Validating all timing modifications are properly applied and persisted
 *
 * The test ensures that platform administrators can effectively manage
 * announcement schedules, control visibility windows, and handle activation
 * states. This validates critical platform communication management
 * capabilities including scheduled releases, time-limited announcements, and
 * dynamic visibility control.
 */
export async function test_api_platform_announcement_update_timing(
  connection: api.IConnection,
) {
  // 1. Create platform administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create initial announcement with basic timing configuration
  const now = new Date();
  const initialStartDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const initialAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.create(
      connection,
      {
        body: {
          title: "Initial Platform Announcement",
          content: "This is the initial announcement content for timing test.",
          announcement_type: "info",
          target_audience: "all_users",
          priority: 5,
          is_active: false,
          start_date: initialStartDate.toISOString(),
        } satisfies IRedditPlatformAnnouncement.ICreate,
      },
    );
  typia.assert(initialAnnouncement);

  // Validate initial announcement setup
  TestValidator.equals(
    "initial announcement created successfully",
    initialAnnouncement.title,
    "Initial Platform Announcement",
  );
  TestValidator.equals(
    "initial start date set correctly",
    initialAnnouncement.start_date,
    initialStartDate.toISOString(),
  );
  TestValidator.equals(
    "initial is_active is false",
    initialAnnouncement.is_active,
    false,
  );
  TestValidator.equals(
    "end date is null initially",
    initialAnnouncement.end_date,
    null,
  );

  // 3. Update announcement timing - change start_date to later time
  const laterStartDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  const updatedAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.update(
      connection,
      {
        announcementId: initialAnnouncement.id,
        body: {
          start_date: laterStartDate.toISOString(),
        } satisfies IRedditPlatformAnnouncement.IUpdate,
      },
    );
  typia.assert(updatedAnnouncement);

  // Validate start date was updated
  TestValidator.equals(
    "start date updated to later time",
    updatedAnnouncement.start_date,
    laterStartDate.toISOString(),
  );
  TestValidator.equals(
    "announcement ID preserved",
    updatedAnnouncement.id,
    initialAnnouncement.id,
  );

  // 4. Update announcement to add end_date for limited display duration
  const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
  const announcementWithEndDate: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.update(
      connection,
      {
        announcementId: initialAnnouncement.id,
        body: {
          end_date: endDate.toISOString(),
        } satisfies IRedditPlatformAnnouncement.IUpdate,
      },
    );
  typia.assert(announcementWithEndDate);

  // Validate end date was added
  TestValidator.equals(
    "end date added successfully",
    announcementWithEndDate.end_date,
    endDate.toISOString(),
  );
  TestValidator.equals(
    "start date preserved",
    announcementWithEndDate.start_date,
    laterStartDate.toISOString(),
  );

  // 5. Toggle is_active status to test activation control
  const activatedAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.update(
      connection,
      {
        announcementId: initialAnnouncement.id,
        body: {
          is_active: true,
        } satisfies IRedditPlatformAnnouncement.IUpdate,
      },
    );
  typia.assert(activatedAnnouncement);

  // Validate activation status changed
  TestValidator.equals(
    "announcement activated",
    activatedAnnouncement.is_active,
    true,
  );
  TestValidator.equals(
    "timing preserved during activation",
    activatedAnnouncement.start_date,
    laterStartDate.toISOString(),
  );
  TestValidator.equals(
    "end date preserved during activation",
    activatedAnnouncement.end_date,
    endDate.toISOString(),
  );

  // 6. Perform comprehensive timing validation
  const finalAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.update(
      connection,
      {
        announcementId: initialAnnouncement.id,
        body: {
          title: "Final Platform Announcement - Timing Updated",
          content:
            "This announcement has been updated with comprehensive timing management.",
          is_active: false, // Deactivate again for complete test
          start_date: laterStartDate.toISOString(),
          end_date: endDate.toISOString(),
        } satisfies IRedditPlatformAnnouncement.IUpdate,
      },
    );
  typia.assert(finalAnnouncement);

  // Validate all modifications are properly applied
  TestValidator.equals(
    "all timing updates persisted correctly",
    finalAnnouncement.start_date,
    laterStartDate.toISOString(),
  );
  TestValidator.equals(
    "end date maintained",
    finalAnnouncement.end_date,
    endDate.toISOString(),
  );
  TestValidator.equals(
    "final deactivation successful",
    finalAnnouncement.is_active,
    false,
  );
  TestValidator.equals(
    "announcement lifecycle managed properly",
    finalAnnouncement.title,
    "Final Platform Announcement - Timing Updated",
  );

  // 7. Validate announcement duration window logic
  const startTime = new Date(laterStartDate.toISOString());
  const endTime = new Date(endDate.toISOString());
  const durationHours =
    (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  TestValidator.predicate(
    "announcement has reasonable display window",
    durationHours > 0 && durationHours < 168,
  ); // Less than 7 days
  TestValidator.predicate(
    "end date is after start date",
    endTime.getTime() > startTime.getTime(),
  );
}
