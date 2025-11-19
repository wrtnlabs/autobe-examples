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
 * Test complete member account deletion workflow where a member creates their
 * account, participates in discussions by creating posts, and then decides to
 * delete their own account. Validates that soft deletion properly marks the
 * account as deleted while preserving data integrity and preventing
 * unauthorized deletions.
 */
export async function test_api_member_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for infrastructure setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create discussion channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within channel
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

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create test post to validate member participation
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

  // Step 6: Perform member account deletion
  const deletedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.erase(connection, {
      username: memberUsername,
    });
  typia.assert(deletedMember);

  // Step 7: Validate soft deletion by checking deleted_at timestamp
  TestValidator.predicate(
    "deleted_at timestamp should be set after deletion",
    deletedMember.deleted_at !== undefined && deletedMember.deleted_at !== null,
  );

  TestValidator.equals(
    "member ID should remain unchanged after deletion",
    deletedMember.id,
    member.id,
  );

  TestValidator.equals(
    "member email should remain unchanged after deletion",
    deletedMember.email,
    member.email,
  );

  TestValidator.equals(
    "member username should remain unchanged after deletion",
    deletedMember.username,
    member.username,
  );

  // Step 8: Verify unauthorized deletion attempts fail
  await TestValidator.error(
    "cannot delete already deleted member account",
    async () => {
      await api.functional.discussionBoard.member.members.erase(connection, {
        username: memberUsername,
      });
    },
  );

  // Step 9: Test deletion with non-existent username
  await TestValidator.error(
    "cannot delete non-existent member account",
    async () => {
      await api.functional.discussionBoard.member.members.erase(connection, {
        username: "nonexistent_user_12345",
      });
    },
  );
}
