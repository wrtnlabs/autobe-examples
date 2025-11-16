import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

export async function test_api_member_preferences_update_notification_toggles_independently(
  connection: api.IConnection,
) {
  // Step 1: Create a member account through authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);
  const memberId = joinResponse.id;

  // Step 2: Update notify_on_post_upvotes to false
  const updatePostUpvotes =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          notify_on_post_upvotes: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updatePostUpvotes);
  TestValidator.equals(
    "notify_on_post_upvotes should be false after first update",
    updatePostUpvotes.notify_on_post_upvotes,
    false,
  );

  // Step 3: Update notify_on_comment_upvotes independently
  const updateCommentUpvotes =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          notify_on_comment_upvotes: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateCommentUpvotes);

  TestValidator.equals(
    "notify_on_comment_upvotes should be false after second update",
    updateCommentUpvotes.notify_on_comment_upvotes,
    false,
  );
  TestValidator.equals(
    "notify_on_post_upvotes should still be false from first update",
    updateCommentUpvotes.notify_on_post_upvotes,
    false,
  );

  // Step 4: Update notify_on_mentions independently
  const updateMentions =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          notify_on_mentions: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateMentions);

  TestValidator.equals(
    "notify_on_mentions should be false after third update",
    updateMentions.notify_on_mentions,
    false,
  );
  TestValidator.equals(
    "notify_on_post_upvotes should still be false from first update",
    updateMentions.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "notify_on_comment_upvotes should still be false from second update",
    updateMentions.notify_on_comment_upvotes,
    false,
  );

  // Step 5: Update notify_on_comment_replies independently
  const updateCommentReplies =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          notify_on_comment_replies: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateCommentReplies);

  TestValidator.equals(
    "notify_on_comment_replies should be false after fourth update",
    updateCommentReplies.notify_on_comment_replies,
    false,
  );
  TestValidator.equals(
    "notify_on_post_upvotes should still be false",
    updateCommentReplies.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "notify_on_mentions should still be false",
    updateCommentReplies.notify_on_mentions,
    false,
  );

  // Step 6: Update notification_frequency to test enum field independence
  const updateFrequency =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          notification_frequency: "weekly" as const,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateFrequency);

  TestValidator.equals(
    "notification_frequency should be weekly",
    updateFrequency.notification_frequency,
    "weekly",
  );
  TestValidator.equals(
    "notify_on_post_upvotes should still be false",
    updateFrequency.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "notify_on_comment_upvotes should still be false",
    updateFrequency.notify_on_comment_upvotes,
    false,
  );
  TestValidator.equals(
    "notify_on_mentions should still be false",
    updateFrequency.notify_on_mentions,
    false,
  );

  // Step 7: Update notify_on_community_updates independently
  const updateCommunityUpdates =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          notify_on_community_updates: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateCommunityUpdates);

  TestValidator.equals(
    "notify_on_community_updates should be false",
    updateCommunityUpdates.notify_on_community_updates,
    false,
  );
  TestValidator.equals(
    "notification_frequency should still be weekly",
    updateCommunityUpdates.notification_frequency,
    "weekly",
  );

  // Step 8: Update show_profile_publicly independently (profile visibility setting)
  const updateProfileVisibility =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          show_profile_publicly: false,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateProfileVisibility);

  TestValidator.equals(
    "show_profile_publicly should be false",
    updateProfileVisibility.show_profile_publicly,
    false,
  );
  TestValidator.equals(
    "notify_on_post_upvotes should still be false",
    updateProfileVisibility.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "notification_frequency should still be weekly",
    updateProfileVisibility.notification_frequency,
    "weekly",
  );

  // Step 9: Update allow_direct_messages independently (direct message setting)
  const updateDirectMessages =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId,
        body: {
          allow_direct_messages: "followers_only" as const,
        } satisfies ICommunityPlatformMemberPreference.IUpdate,
      },
    );
  typia.assert(updateDirectMessages);

  TestValidator.equals(
    "allow_direct_messages should be followers_only",
    updateDirectMessages.allow_direct_messages,
    "followers_only",
  );
  TestValidator.equals(
    "show_profile_publicly should still be false",
    updateDirectMessages.show_profile_publicly,
    false,
  );
  TestValidator.equals(
    "notify_on_mentions should still be false",
    updateDirectMessages.notify_on_mentions,
    false,
  );
}
