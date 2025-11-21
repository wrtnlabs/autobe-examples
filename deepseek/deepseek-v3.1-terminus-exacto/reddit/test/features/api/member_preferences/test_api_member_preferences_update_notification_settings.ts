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
 * Comprehensive E2E test for member notification preference updates
 *
 * This test validates the complete workflow of updating member notification
 * preferences, including email notifications, push notifications, language
 * settings, timezone configuration, and content filtering levels. The test
 * ensures partial update functionality works correctly and validates security
 * measures where members can only modify their own preferences.
 */
export async function test_api_member_preferences_update_notification_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";
  const memberDisplayName = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to fulfill prerequisite requirements
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Update member preferences with partial modifications
  const updateData = {
    email_notifications: false,
    push_notifications: true,
    language: "es",
    timezone: "America/New_York",
    content_filter_level: "strict",
  } satisfies ICommunityPlatformUserPreference.IUpdate;

  const updatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member.id,
        body: updateData,
      },
    );
  typia.assert(updatedPreferences);

  // Step 4: Validate that preferences were correctly updated
  TestValidator.equals(
    "email notifications should be disabled",
    updatedPreferences.email_notifications,
    false,
  );
  TestValidator.equals(
    "push notifications should be enabled",
    updatedPreferences.push_notifications,
    true,
  );
  TestValidator.equals(
    "language should be Spanish",
    updatedPreferences.language,
    "es",
  );
  TestValidator.equals(
    "timezone should be America/New_York",
    updatedPreferences.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "content filter level should be strict",
    updatedPreferences.content_filter_level,
    "strict",
  );

  // Step 5: Validate member reference matches authenticated member
  TestValidator.equals(
    "preference member ID should match authenticated member",
    updatedPreferences.member.id,
    member.id,
  );
  TestValidator.equals(
    "preference member email should match",
    updatedPreferences.member.email,
    member.email,
  );
  TestValidator.equals(
    "preference member display name should match",
    updatedPreferences.member.display_name,
    member.display_name,
  );

  // Step 6: Validate timestamps are properly maintained
  TestValidator.predicate(
    "created_at timestamp should be valid",
    updatedPreferences.created_at !== null &&
      updatedPreferences.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    updatedPreferences.updated_at !== null &&
      updatedPreferences.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedPreferences.updated_at) >=
      new Date(updatedPreferences.created_at),
  );

  // Step 7: Test partial update functionality - update only specific fields
  const partialUpdateData = {
    language: "fr",
    content_filter_level: "moderate",
  } satisfies ICommunityPlatformUserPreference.IUpdate;

  const partiallyUpdatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member.id,
        body: partialUpdateData,
      },
    );
  typia.assert(partiallyUpdatedPreferences);

  // Step 8: Validate partial update preserved unchanged values
  TestValidator.equals(
    "email notifications should remain disabled after partial update",
    partiallyUpdatedPreferences.email_notifications,
    false,
  );
  TestValidator.equals(
    "push notifications should remain enabled after partial update",
    partiallyUpdatedPreferences.push_notifications,
    true,
  );
  TestValidator.equals(
    "language should be updated to French",
    partiallyUpdatedPreferences.language,
    "fr",
  );
  TestValidator.equals(
    "timezone should remain America/New_York",
    partiallyUpdatedPreferences.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "content filter level should be updated to moderate",
    partiallyUpdatedPreferences.content_filter_level,
    "moderate",
  );

  // Step 9: Validate updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at should be newer after partial update",
    new Date(partiallyUpdatedPreferences.updated_at) >
      new Date(updatedPreferences.updated_at),
  );

  // Step 10: Test security validation - members can only update their own preferences
  const fakeMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject update for non-existent member ID",
    async () => {
      await api.functional.communityPlatform.member.members.preferences.update(
        connection,
        {
          memberId: fakeMemberId,
          body: {
            email_notifications: true,
          } satisfies ICommunityPlatformUserPreference.IUpdate,
        },
      );
    },
  );

  // Step 11: Test optional field behavior - update with minimal data
  const minimalUpdateData = {
    push_notifications: false,
  } satisfies ICommunityPlatformUserPreference.IUpdate;

  const minimallyUpdatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: member.id,
        body: minimalUpdateData,
      },
    );
  typia.assert(minimallyUpdatedPreferences);

  // Step 12: Validate minimal update preserved all other values
  TestValidator.equals(
    "push notifications should be disabled after minimal update",
    minimallyUpdatedPreferences.push_notifications,
    false,
  );
  TestValidator.equals(
    "email notifications should remain disabled",
    minimallyUpdatedPreferences.email_notifications,
    false,
  );
  TestValidator.equals(
    "language should remain French",
    minimallyUpdatedPreferences.language,
    "fr",
  );
  TestValidator.equals(
    "timezone should remain America/New_York",
    minimallyUpdatedPreferences.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "content filter level should remain moderate",
    minimallyUpdatedPreferences.content_filter_level,
    "moderate",
  );

  // Step 13: Final validation of preference integrity
  TestValidator.predicate(
    "member reference should remain consistent",
    minimallyUpdatedPreferences.member.id === member.id,
  );
  TestValidator.predicate(
    "final updated_at should be newest",
    new Date(minimallyUpdatedPreferences.updated_at) >
      new Date(partiallyUpdatedPreferences.updated_at) &&
      new Date(minimallyUpdatedPreferences.updated_at) >
        new Date(updatedPreferences.updated_at),
  );
}
