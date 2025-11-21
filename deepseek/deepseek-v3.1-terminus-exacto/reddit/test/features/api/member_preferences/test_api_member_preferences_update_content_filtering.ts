import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPreference";

/**
 * Test specific update of content filtering preferences with different levels
 * (strict, moderate, lenient) to validate preference customization workflow.
 *
 * The scenario ensures that content filter level changes are properly applied
 * and persist across sessions. The test validates that preference updates
 * maintain data integrity and respect schema constraints for content filtering
 * configuration.
 */
export async function test_api_member_preferences_update_content_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account and establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to fulfill prerequisite requirement
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test content filtering preference updates with all available levels
  const contentFilterLevels = ["strict", "moderate", "lenient"] as const;

  for (const filterLevel of contentFilterLevels) {
    // Update preference with specific content filter level
    const updatedPreference =
      await api.functional.communityPlatform.member.members.preferences.update(
        connection,
        {
          memberId: member.id,
          body: {
            content_filter_level: filterLevel,
          } satisfies ICommunityPlatformUserPreference.IUpdate,
        },
      );
    typia.assert(updatedPreference);

    // Validate that the content filter level was correctly updated
    TestValidator.equals(
      `content filter level should be updated to ${filterLevel}`,
      updatedPreference.content_filter_level,
      filterLevel,
    );

    // Validate member reference matches authenticated member
    TestValidator.equals(
      "preference member ID should match authenticated member ID",
      updatedPreference.member.id,
      member.id,
    );

    // Validate that other preference fields remain intact
    TestValidator.predicate(
      "email notifications field should maintain boolean type",
      typeof updatedPreference.email_notifications === "boolean",
    );
    TestValidator.predicate(
      "push notifications field should maintain boolean type",
      typeof updatedPreference.push_notifications === "boolean",
    );
    TestValidator.predicate(
      "language field should maintain string type",
      typeof updatedPreference.language === "string",
    );
    TestValidator.predicate(
      "timezone field should maintain string type",
      typeof updatedPreference.timezone === "string",
    );

    // Validate timestamp updates
    TestValidator.predicate(
      "updated_at timestamp should reflect recent update",
      new Date(updatedPreference.updated_at).getTime() > Date.now() - 60000,
    );
  }

  // Step 4: Test partial update with multiple preference fields
  const comprehensiveUpdate =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member.id,
        body: {
          content_filter_level: "moderate",
          email_notifications: false,
          push_notifications: true,
          language: "en",
          timezone: "America/New_York",
        } satisfies ICommunityPlatformUserPreference.IUpdate,
      },
    );
  typia.assert(comprehensiveUpdate);

  // Validate comprehensive update
  TestValidator.equals(
    "comprehensive update should correctly set content filter level to moderate",
    comprehensiveUpdate.content_filter_level,
    "moderate",
  );
  TestValidator.equals(
    "comprehensive update should correctly set email notifications to false",
    comprehensiveUpdate.email_notifications,
    false,
  );
  TestValidator.equals(
    "comprehensive update should correctly set push notifications to true",
    comprehensiveUpdate.push_notifications,
    true,
  );
  TestValidator.equals(
    "comprehensive update should correctly set language to English",
    comprehensiveUpdate.language,
    "en",
  );
  TestValidator.equals(
    "comprehensive update should correctly set timezone to America/New_York",
    comprehensiveUpdate.timezone,
    "America/New_York",
  );

  // Step 5: Test that preferences persist across multiple updates
  const finalUpdate =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member.id,
        body: {
          content_filter_level: "lenient",
        } satisfies ICommunityPlatformUserPreference.IUpdate,
      },
    );
  typia.assert(finalUpdate);

  // Validate persistence - other fields should remain from previous update
  TestValidator.equals(
    "final update should successfully change content filter level to lenient",
    finalUpdate.content_filter_level,
    "lenient",
  );
  TestValidator.equals(
    "email notifications should persist unchanged from comprehensive update",
    finalUpdate.email_notifications,
    false,
  );
  TestValidator.equals(
    "push notifications should persist unchanged from comprehensive update",
    finalUpdate.push_notifications,
    true,
  );
  TestValidator.equals(
    "language should persist unchanged from comprehensive update",
    finalUpdate.language,
    "en",
  );
  TestValidator.equals(
    "timezone should persist unchanged from comprehensive update",
    finalUpdate.timezone,
    "America/New_York",
  );
}
