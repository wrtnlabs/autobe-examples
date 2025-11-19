import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test member profile update with password change, validating password strength
 * requirements and secure credential updates. This scenario ensures that
 * password changes follow security best practices including proper hashing and
 * verification workflows.
 */
export async function test_api_member_profile_update_password_change(
  connection: api.IConnection,
) {
  // Step 1: Create member account with initial credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123";
  const memberJoinBody = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: initialPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // Step 2: Create moderator account for infrastructure setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(8),
    password: "ModeratorPass123",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    moderation_level: "basic",
    href: "https://example.com/moderator/register",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderator);

  // Step 3: Create channel and section for post creation
  const channelBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IDiscussionBoardChannel.ICreate;

  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  const sectionBody = {
    name: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    channel: {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      status: channel.status,
      created_at: channel.created_at,
    } satisfies IDiscussionBoardChannel.ISummary,
  } satisfies IDiscussionBoardSection.ICreate;

  const section =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // Step 4: Create post to establish member existence
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    discussion_board_channel_id: channel.id,
    discussion_board_section_id: section.id,
  } satisfies IDiscussionBoardPost.ICreate;

  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert(post);

  // Step 5: Update member profile with password change
  const newPassword = "NewSecurePass456";
  const updateBody = {
    password: newPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardMember.IUpdate;

  const updatedMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      username: member.username,
      body: updateBody,
    });
  typia.assert(updatedMember);

  // Step 6: Validate password change through authentication
  const loginBody = {
    email: memberEmail,
    password: newPassword,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.ILogin;

  const reauthenticatedMember = await api.functional.auth.member.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(reauthenticatedMember);

  // Validate that authentication succeeded with new password
  TestValidator.equals(
    "member should authenticate with new password",
    reauthenticatedMember.id,
    member.id,
  );

  // Validate that display name was updated
  TestValidator.equals(
    "display name should be updated",
    updatedMember.display_name,
    updateBody.display_name,
  );

  // Validate that bio was updated
  TestValidator.equals(
    "bio should be updated",
    updatedMember.bio,
    updateBody.bio,
  );

  // Test that old password no longer works
  await TestValidator.error(
    "old password should fail authentication",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: initialPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
