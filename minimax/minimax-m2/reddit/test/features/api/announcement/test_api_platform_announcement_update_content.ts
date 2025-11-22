import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_announcement_update_content(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdmin123!",
        administrator_level: "super_admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial announcement targeting all users
  const initialAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.create(
      connection,
      {
        body: {
          title: "Initial Platform Update Notice",
          content:
            "This is the initial announcement content that will be updated.",
          announcement_type: "info",
          target_audience: "all_users",
          priority: 5,
          is_active: true,
          start_date: new Date().toISOString(),
        } satisfies IRedditPlatformAnnouncement.ICreate,
      },
    );
  typia.assert(initialAnnouncement);

  // Store original announcement ID and details for validation
  const originalAnnouncementId = initialAnnouncement.id;
  const originalPriority = initialAnnouncement.priority;
  const originalAudience = initialAnnouncement.target_audience;

  // Step 3: Update the announcement with new content, higher priority, and changed audience
  const updatedAnnouncement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.update(
      connection,
      {
        announcementId: originalAnnouncementId,
        body: {
          title: "Updated Platform Maintenance Notice",
          content:
            "This announcement has been updated with new critical information about platform maintenance.",
          announcement_type: "warning",
          target_audience: "registered_users",
          priority: 8,
          is_active: true,
          start_date: new Date().toISOString(),
        } satisfies IRedditPlatformAnnouncement.IUpdate,
      },
    );
  typia.assert(updatedAnnouncement);

  // Step 4: Validate the update operation
  // Check that announcement ID remains the same
  TestValidator.equals(
    "announcement ID should remain unchanged",
    updatedAnnouncement.id,
    originalAnnouncementId,
  );

  // Check that title was updated
  TestValidator.equals(
    "announcement title should be updated",
    updatedAnnouncement.title,
    "Updated Platform Maintenance Notice",
  );

  // Check that content was updated
  TestValidator.equals(
    "announcement content should be updated",
    updatedAnnouncement.content,
    "This announcement has been updated with new critical information about platform maintenance.",
  );

  // Check that announcement type was updated
  TestValidator.equals(
    "announcement type should be updated",
    updatedAnnouncement.announcement_type,
    "warning",
  );

  // Check that target audience was changed from all_users to registered_users
  TestValidator.equals(
    "target audience should be changed to registered_users",
    updatedAnnouncement.target_audience,
    "registered_users",
  );

  // Check that priority was increased
  TestValidator.predicate(
    "priority should be increased",
    updatedAnnouncement.priority > originalPriority,
  );

  // Check that announcement is still active
  TestValidator.equals(
    "announcement should remain active",
    updatedAnnouncement.is_active,
    true,
  );

  // Check that timestamps were updated (updated_at should be later than created_at)
  TestValidator.predicate(
    "updated timestamp should be later than created timestamp",
    new Date(updatedAnnouncement.updated_at) >
      new Date(updatedAnnouncement.created_at),
  );
}
