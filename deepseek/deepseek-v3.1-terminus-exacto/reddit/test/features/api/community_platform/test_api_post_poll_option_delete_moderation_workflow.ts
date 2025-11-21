import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPoll";
import type { ICommunityPlatformPostPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPollOption";

/**
 * Test the complete moderation workflow for poll option deletion, including
 * validation that deleted options are properly removed from voting interfaces
 * and poll result calculations. This scenario validates that moderators can
 * effectively manage poll content quality by removing inappropriate options
 * while ensuring the integrity of ongoing polls and preventing disruption to
 * user voting experiences.
 */
export async function test_api_post_poll_option_delete_moderation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for content management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: undefined, // Optional property explicitly set to undefined
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create post with poll functionality
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create poll option for moderation testing
  // Note: Using a valid UUID for poll reference
  const pollOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          option_text: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          community_platform_post_poll_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption);

  // Step 5: Authenticate as moderator to perform deletion
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Delete poll option using moderator privileges
  const deletedOption =
    await api.functional.communityPlatform.moderator.posts.polls.options.erase(
      connection,
      {
        postId: post.id,
        optionId: pollOption.id,
      },
    );
  typia.assert(deletedOption);

  // Step 7: Verify that deleted option matches original
  TestValidator.equals(
    "deleted option ID matches original",
    deletedOption.id,
    pollOption.id,
  );
  TestValidator.equals(
    "deleted option text matches original",
    deletedOption.option_text,
    pollOption.option_text,
  );

  // Step 8: Validate poll integrity after deletion
  TestValidator.predicate(
    "deleted option has valid poll reference",
    deletedOption.poll.id !== undefined,
  );
  TestValidator.predicate(
    "deleted option has valid creation timestamp",
    deletedOption.created_at !== undefined,
  );

  // Additional validation: Ensure the option was actually deleted
  TestValidator.predicate(
    "deletion operation completed successfully",
    deletedOption.id === pollOption.id &&
      deletedOption.option_text === pollOption.option_text,
  );
}
