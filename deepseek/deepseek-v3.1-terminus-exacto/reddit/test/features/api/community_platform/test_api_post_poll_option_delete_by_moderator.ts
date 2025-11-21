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
 * Test that authenticated moderators can successfully delete poll options from
 * posts within their moderation scope. This scenario validates the complete
 * moderation workflow from moderator registration through post creation, poll
 * option creation, and finally deleting the poll option. The test ensures
 * moderators can remove inappropriate or outdated poll options while
 * maintaining proper authorization checks and community content quality
 * standards.
 */
export async function test_api_post_poll_option_delete_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community platform post with poll type
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Create a mock poll ID for the options (since we don't have poll creation API)
  const mockPollId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create poll options
  const pollOption1: ICommunityPlatformPostPollOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          option_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 6,
          }),
          display_order: 1,
          community_platform_post_poll_id: mockPollId,
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption1);

  const pollOption2: ICommunityPlatformPostPollOption =
    await api.functional.communityPlatform.member.posts.polls.options.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          option_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 6,
          }),
          display_order: 2,
          community_platform_post_poll_id: mockPollId,
        } satisfies ICommunityPlatformPostPollOption.ICreate,
      },
    );
  typia.assert(pollOption2);

  // Step 5: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Delete poll option using moderator privileges
  const deletedOption: ICommunityPlatformPostPollOption =
    await api.functional.communityPlatform.moderator.posts.polls.options.erase(
      connection,
      {
        postId: post.id,
        optionId: pollOption1.id,
      },
    );
  typia.assert(deletedOption);

  // Step 7: Validate successful deletion
  TestValidator.equals(
    "deleted option ID matches",
    deletedOption.id,
    pollOption1.id,
  );
  TestValidator.equals(
    "deleted option text matches",
    deletedOption.option_text,
    pollOption1.option_text,
  );
  TestValidator.equals(
    "deleted option display order matches",
    deletedOption.display_order,
    pollOption1.display_order,
  );

  // Additional validation: Test that regular members cannot delete poll options
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // This should fail since members don't have moderator privileges
  await TestValidator.error(
    "members should not be able to delete poll options",
    async () => {
      await api.functional.communityPlatform.moderator.posts.polls.options.erase(
        connection,
        {
          postId: post.id,
          optionId: pollOption2.id,
        },
      );
    },
  );
}
