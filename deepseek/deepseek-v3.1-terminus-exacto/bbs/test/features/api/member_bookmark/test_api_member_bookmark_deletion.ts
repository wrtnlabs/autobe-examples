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
 * Test bookmark deletion workflow for discussion board members.
 *
 * Validates that authenticated members can successfully delete their own
 * bookmarks through soft deletion functionality. The test ensures proper
 * authentication, prerequisite setup (channel, section, post creation), and
 * verifies that bookmarks are marked as deleted while preserving the record for
 * potential restoration.
 */
export async function test_api_member_bookmark_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for channel/section creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "moderator123",
        moderation_level: "admin",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
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

  // Step 4: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "member123",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create a post for bookmarking
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

  // Step 6: Create bookmark for the member
  const bookmark: IDiscussionBoardUserBookmark =
    await api.functional.discussionBoard.member.members.bookmarks.postByMemberid(
      connection,
      {
        memberId: member.id,
        body: {
          discussion_board_post_id: post.id,
        } satisfies IDiscussionBoardUserBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // Step 7: Delete the bookmark
  const deletedBookmark: IDiscussionBoardUserBookmark =
    await api.functional.discussionBoard.member.members.bookmarks.eraseByMemberidAndBookmarkid(
      connection,
      {
        memberId: member.id,
        bookmarkId: bookmark.id,
      },
    );
  typia.assert(deletedBookmark);

  // Step 8: Validate soft deletion functionality
  TestValidator.equals(
    "bookmark ID should match",
    deletedBookmark.id,
    bookmark.id,
  );
  TestValidator.equals(
    "member ID should match",
    deletedBookmark.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "post ID should match",
    deletedBookmark.discussion_board_post_id,
    post.id,
  );
  TestValidator.predicate(
    "bookmark should have deleted_at timestamp",
    deletedBookmark.deleted_at !== null &&
      deletedBookmark.deleted_at !== undefined,
  );
  TestValidator.notEquals(
    "deleted_at should not be null",
    deletedBookmark.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "deleted_at should not be undefined",
    deletedBookmark.deleted_at,
    undefined,
  );
}
