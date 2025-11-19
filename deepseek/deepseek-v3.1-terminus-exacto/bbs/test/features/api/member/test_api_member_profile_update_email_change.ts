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
 * Test member profile update with email address change, including validation of
 * email format uniqueness and re-verification requirements. This scenario
 * validates the email update workflow including potential conflicts with
 * existing accounts and ensures proper security measures for credential
 * changes.
 */
export async function test_api_member_profile_update_email_change(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and establish discussion board infrastructure
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Create section within the channel using proper channel summary construction
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          channel: {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            status: channel.status,
            created_at: channel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 2: Create initial member account that will update email address
  const initialMemberEmail = typia.random<string & tags.Format<"email">>();
  const initialMemberUsername = RandomGenerator.alphabets(8);
  const initialMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: initialMemberEmail,
        username: initialMemberUsername,
        password: "member123",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(initialMember);

  // Validate initial member state
  TestValidator.equals(
    "initial member email matches",
    initialMember.email,
    initialMemberEmail,
  );
  TestValidator.equals(
    "initial member username matches",
    initialMember.username,
    initialMemberUsername,
  );

  // Step 3: Create a post to establish member existence prerequisite
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create second member account for email uniqueness testing
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberUsername = RandomGenerator.alphabets(8);
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        username: secondMemberUsername,
        password: "member456",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 5: Perform email update operation with valid new email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      username: initialMemberUsername,
      body: {
        email: newEmail,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Validate that email was successfully updated
  TestValidator.equals(
    "email should be updated to new value",
    updatedMember.email,
    newEmail,
  );
  TestValidator.equals(
    "username should remain unchanged",
    updatedMember.username,
    initialMemberUsername,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedMember.updated_at,
    initialMember.updated_at,
  );

  // Step 6: Test email uniqueness constraint by attempting to update to an existing member email
  await TestValidator.error("should reject duplicate email", async () => {
    await api.functional.discussionBoard.member.members.update(connection, {
      username: initialMemberUsername,
      body: {
        email: secondMember.email, // Attempt to use second member's email (already exists)
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  });

  // Step 7: Verify profile integrity after failed update attempt
  const currentMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      username: initialMemberUsername,
      body: {
        bio: "Updated bio after email change",
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(currentMember);

  // Final validation that email remains unchanged after failed duplicate attempt
  TestValidator.equals(
    "email should remain as previously updated value",
    currentMember.email,
    newEmail,
  );
  TestValidator.equals(
    "bio should be updated",
    currentMember.bio,
    "Updated bio after email change",
  );
}
