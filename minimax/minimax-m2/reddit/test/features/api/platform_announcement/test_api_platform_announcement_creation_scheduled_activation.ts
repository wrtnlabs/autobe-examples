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
 * Test platform administrator creating an announcement with future scheduled
 * activation date.
 *
 * This test validates the announcement scheduling workflow for planned
 * communications. The scenario begins with platform administrator
 * authentication, then creates an announcement with warning type targeting
 * registered_users, high priority, and a future start_date while setting
 * is_active to false initially. The test validates proper scheduling, inactive
 * status preservation, and future activation capability.
 */
export async function test_api_platform_announcement_creation_scheduled_activation(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for authentication
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@platform-admin.test`;

  const administrator: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdmin123!",
        display_name: "Platform Administrator",
        administrator_level: "super_admin",
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
  typia.assert(administrator);

  // Step 2: Create scheduled announcement with future activation date
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const scheduledAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.create(
      connection,
      {
        body: {
          title: "Important Security Update - Data Protection Notice",
          content:
            "We are implementing enhanced security measures to protect user data. Please review your account settings and ensure your passwords are up to date. Unauthorized access attempts will be monitored and logged for security purposes.",
          announcement_type: "warning",
          target_audience: "registered_users",
          priority: 8,
          is_active: false,
          start_date: futureDate.toISOString(),
          end_date: null,
        } satisfies IRedditPlatformAnnouncement.ICreate,
      },
    );
  typia.assert(scheduledAnnouncement);

  // Step 3: Validate announcement creation and scheduling parameters
  TestValidator.equals(
    "announcement title matches input",
    scheduledAnnouncement.title,
    "Important Security Update - Data Protection Notice",
  );
  TestValidator.equals(
    "announcement type is warning",
    scheduledAnnouncement.announcement_type,
    "warning",
  );
  TestValidator.equals(
    "target audience is registered_users",
    scheduledAnnouncement.target_audience,
    "registered_users",
  );
  TestValidator.equals(
    "priority level is high",
    scheduledAnnouncement.priority,
    8,
  );
  TestValidator.equals(
    "announcement is inactive initially",
    scheduledAnnouncement.is_active,
    false,
  );
  TestValidator.equals(
    "start date is future date",
    scheduledAnnouncement.start_date,
    futureDate.toISOString(),
  );
  TestValidator.equals(
    "no end date specified",
    scheduledAnnouncement.end_date,
    null,
  );

  // Validate that the announcement is properly scheduled and not immediately visible
  TestValidator.predicate(
    "future activation date is properly set",
    new Date(scheduledAnnouncement.start_date) > new Date(),
  );
  TestValidator.predicate(
    "inactive status is preserved",
    scheduledAnnouncement.is_active === false,
  );

  // Verify announcement has unique ID and proper timestamps
  TestValidator.predicate(
    "announcement has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      scheduledAnnouncement.id,
    ),
  );
  TestValidator.predicate(
    "announcement has creation timestamp",
    scheduledAnnouncement.created_at !== undefined &&
      scheduledAnnouncement.created_at !== null,
  );
  TestValidator.predicate(
    "announcement has update timestamp",
    scheduledAnnouncement.updated_at !== undefined &&
      scheduledAnnouncement.updated_at !== null,
  );
}
