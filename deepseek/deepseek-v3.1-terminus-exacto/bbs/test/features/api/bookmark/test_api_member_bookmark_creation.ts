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
import type { IDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBookmark";

/**
 * Test bookmark creation workflow where a member creates a bookmark for a post
 * they want to save for later reference. The scenario validates that
 * authenticated members can bookmark posts they have access to, ensuring proper
 * relationship creation between member and post entities. The test verifies
 * that duplicate bookmarks are prevented and that the bookmark record includes
 * proper timestamps and relationship references.
 *
 * This comprehensive test follows a complete workflow:
 *
 * 1. Create moderator account to establish channel and section structure
 * 2. Create member account for authentication context
 * 3. Create discussion board channel and section for post categorization
 * 4. Create post that will be bookmarked
 * 5. Authenticate as member and create bookmark
 * 6. Validate bookmark creation with proper relationship references
 *
 * The test ensures that bookmarks establish correct relationships between
 * members and posts, include proper timestamps, and prevent duplicate
 * bookmarking attempts.
 */
export async function test_api_member_bookmark_creation(
  connection: api.IConnection,
) {
  // 1. Create moderator account for channel/section creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        moderation_level: "admin",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Authenticate as moderator for channel/section creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 2. Create channel for post categorization
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 4. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";
  const memberUsername = RandomGenerator.name(1);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Authenticate as member for post creation and bookmarking
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 5. Create post to bookmark
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

  // 6. Create bookmark
  const bookmark: IDiscussionBoardUserBookmark =
    await api.functional.discussionBoard.member.members.bookmarks.postByUsername(
      connection,
      {
        username: memberUsername,
        body: {
          discussion_board_post_id: post.id,
        } satisfies IDiscussionBoardUserBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // 7. Validate bookmark properties
  TestValidator.equals(
    "bookmark member ID matches",
    bookmark.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "bookmark post ID matches",
    bookmark.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "member reference matches",
    bookmark.member.id,
    member.id,
  );
  TestValidator.equals("post reference matches", bookmark.post.id, post.id);
  TestValidator.predicate(
    "bookmark has valid creation timestamp",
    bookmark.created_at !== undefined && bookmark.created_at.length > 0,
  );
  TestValidator.predicate(
    "bookmark has valid update timestamp",
    bookmark.updated_at !== undefined && bookmark.updated_at.length > 0,
  );

  // 8. Test duplicate bookmark prevention
  await TestValidator.error("duplicate bookmark should fail", async () => {
    await api.functional.discussionBoard.member.members.bookmarks.postByUsername(
      connection,
      {
        username: memberUsername,
        body: {
          discussion_board_post_id: post.id,
        } satisfies IDiscussionBoardUserBookmark.ICreate,
      },
    );
  });
}
