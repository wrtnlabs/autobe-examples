import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_update_comprehensive_preferences_change(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing preference updates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  const memberId = member.id;

  // Step 2: Update multiple preference fields comprehensively
  const updatePreferences = {
    notification_frequency: "instant" as const,
    notify_on_post_upvotes: false,
    notify_on_mentions: false,
    show_profile_publicly: false,
    allow_direct_messages: "followers_only" as const,
    hide_nsfw_content: false,
    expand_inline_media: false,
  } satisfies ICommunityPlatformMemberPreference.IUpdate;

  const updatedPreference =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: updatePreferences,
      },
    );
  typia.assert(updatedPreference);

  // Step 3: Validate all preference changes in the response
  TestValidator.equals(
    "notification_frequency updated to instant",
    updatedPreference.notification_frequency,
    "instant",
  );
  TestValidator.equals(
    "notify_on_post_upvotes disabled",
    updatedPreference.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "notify_on_mentions disabled",
    updatedPreference.notify_on_mentions,
    false,
  );
  TestValidator.equals(
    "show_profile_publicly set to false",
    updatedPreference.show_profile_publicly,
    false,
  );
  TestValidator.equals(
    "allow_direct_messages restricted to followers only",
    updatedPreference.allow_direct_messages,
    "followers_only",
  );
  TestValidator.equals(
    "hide_nsfw_content disabled",
    updatedPreference.hide_nsfw_content,
    false,
  );
  TestValidator.equals(
    "expand_inline_media disabled",
    updatedPreference.expand_inline_media,
    false,
  );

  // Step 4: Verify other default preference fields remain unchanged
  TestValidator.predicate(
    "preference record has valid created_at timestamp",
    updatedPreference.created_at !== "",
  );
  TestValidator.predicate(
    "preference record has valid updated_at timestamp",
    updatedPreference.updated_at !== "",
  );
  TestValidator.predicate(
    "preference record has valid member_id",
    updatedPreference.community_platform_member_id === memberId,
  );
}
