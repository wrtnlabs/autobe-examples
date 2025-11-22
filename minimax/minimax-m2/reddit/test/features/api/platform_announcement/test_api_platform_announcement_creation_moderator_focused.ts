import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_announcement_creation_moderator_focused(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";
  const adminDisplayName = RandomGenerator.name(2);
  const systemPermissions = typia.random<string & tags.MinLength<1>>();

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        administrator_level: "admin",
        system_permissions: systemPermissions,
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create announcement targeting community moderators
  const announcementContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const announcement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.platformAdministrator.announcements.create(
      connection,
      {
        body: {
          title: `Feature Update: Enhanced Moderation Tools`,
          content: `${announcementContent}\n\nThis update includes new moderation capabilities designed specifically for community moderators. Key features include:\n\n• Advanced content filtering options\n• Improved user reporting workflows  \n• Enhanced community management dashboard\n• Better integration with community guidelines\n\nPlease review these changes in your moderator settings and update your workflows accordingly.`,
          announcement_type: "feature_update",
          target_audience: "community_moderators",
          priority: 5,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: null,
        } satisfies IRedditPlatformAnnouncement.ICreate,
      },
    );
  typia.assert(announcement);

  // Step 3: Validate announcement creation and targeting
  TestValidator.equals(
    "announcement title matches input",
    announcement.title,
    "Feature Update: Enhanced Moderation Tools",
  );

  TestValidator.equals(
    "announcement targets moderators",
    announcement.target_audience,
    "community_moderators",
  );

  TestValidator.equals(
    "announcement type is feature_update",
    announcement.announcement_type,
    "feature_update",
  );

  TestValidator.equals(
    "announcement priority is moderate",
    announcement.priority,
    5,
  );

  TestValidator.predicate(
    "announcement content includes moderation features",
    announcement.content.includes("moderation") &&
      announcement.content.includes("community moderators"),
  );

  // Step 4: Test announcement error handling - invalid audience
  await TestValidator.error(
    "should reject invalid target audience",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.announcements.create(
        connection,
        {
          body: {
            title: "Invalid Audience Test",
            content: "This should fail",
            announcement_type: "feature_update",
            target_audience: "invalid_audience",
            priority: 3,
            is_active: true,
            start_date: new Date().toISOString(),
          } satisfies IRedditPlatformAnnouncement.ICreate,
        },
      );
    },
  );

  // Step 5: Test announcement error handling - invalid type
  await TestValidator.error(
    "should reject invalid announcement type",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.announcements.create(
        connection,
        {
          body: {
            title: "Invalid Type Test",
            content: "This should fail",
            announcement_type: "invalid_type",
            target_audience: "community_moderators",
            priority: 3,
            is_active: true,
            start_date: new Date().toISOString(),
          } satisfies IRedditPlatformAnnouncement.ICreate,
        },
      );
    },
  );
}
