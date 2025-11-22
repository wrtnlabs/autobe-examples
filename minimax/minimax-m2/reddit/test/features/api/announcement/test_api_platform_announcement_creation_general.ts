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
 * Test the complete workflow for creating a new platform-wide announcement as a
 * platform administrator. Start by authenticating as a platform administrator,
 * then create an announcement with general information type targeting all users
 * with medium priority. Validate that the announcement is successfully created
 * with proper metadata, start date activation, and full content display. This
 * scenario tests the core announcement creation functionality that platform
 * administrators use to communicate important platform updates to all users.
 */
export async function test_api_platform_announcement_creation_general(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";

  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: adminPassword,
        display_name: "Platform Administrator",
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
  typia.assert(platformAdmin);

  // Step 2: Create platform-wide announcement with general information
  const announcementTitle = RandomGenerator.name(3);
  const announcementContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const announcement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.create(
      connection,
      {
        body: {
          title: announcementTitle,
          content: announcementContent,
          announcement_type: "info",
          target_audience: "all_users",
          priority: 5,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: null,
        } satisfies IRedditPlatformAnnouncement.ICreate,
      },
    );
  typia.assert(announcement);

  // Step 3: Validate announcement creation and metadata
  TestValidator.equals(
    "announcement title matches",
    announcement.title,
    announcementTitle,
  );
  TestValidator.equals(
    "announcement content matches",
    announcement.content,
    announcementContent,
  );
  TestValidator.equals(
    "announcement type is info",
    announcement.announcement_type,
    "info",
  );
  TestValidator.equals(
    "target audience is all users",
    announcement.target_audience,
    "all_users",
  );
  TestValidator.equals("priority is medium level", announcement.priority, 5);
  TestValidator.equals("announcement is active", announcement.is_active, true);
  TestValidator.predicate(
    "announcement has valid start date",
    new Date(announcement.start_date) <= new Date(),
  );
  TestValidator.equals(
    "end date is null for indefinite",
    announcement.end_date,
    null,
  );

  // Validate that all required fields are present
  TestValidator.predicate(
    "announcement has UUID",
    announcement.id !== null && announcement.id !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    announcement.created_at !== null && announcement.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    announcement.updated_at !== null && announcement.updated_at !== undefined,
  );

  // Step 4: Validate timestamp consistency
  TestValidator.predicate(
    "created_at is recent",
    new Date(announcement.created_at).getTime() >= Date.now() - 60000,
  ); // Within last minute
  TestValidator.predicate(
    "updated_at matches created_at initially",
    announcement.updated_at === announcement.created_at,
  );
}
