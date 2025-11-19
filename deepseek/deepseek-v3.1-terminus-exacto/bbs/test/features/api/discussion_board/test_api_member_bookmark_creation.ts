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
 * Test the complete bookmark creation workflow where a member creates a
 * bookmark for a post.
 *
 * This E2E test validates that a member can successfully bookmark a post they
 * have access to, ensuring proper authentication, channel/section hierarchy,
 * and post creation prerequisites are met. The test verifies that the bookmark
 * relationship is established correctly with proper foreign key references and
 * that duplicate bookmarks are prevented through unique constraints.
 *
 * The test follows a comprehensive multi-actor scenario:
 *
 * 1. Moderator account creation and authentication
 * 2. Channel and section establishment as prerequisites
 * 3. Member account creation and authentication
 * 4. Post creation within the established section
 * 5. Bookmark creation with proper relationship validation
 * 6. Duplicate bookmark prevention testing
 */
export async function test_api_member_bookmark_creation(
  connection: api.IConnection,
) {
  // 1. Create moderator account for channel/section creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({ sentences: 2 }),
        password: "moderator123",
        moderation_level: "basic",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create channel as prerequisite for section creation
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel as prerequisite for post creation
  const sectionChannelSummary = {
    id: channel.id,
    name: channel.name,
    description: channel.description,
    status: channel.status,
    created_at: channel.created_at,
  } satisfies IDiscussionBoardChannel.ISummary;

  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          channel: sectionChannelSummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create member account for post creation and bookmarking
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.paragraph({ sentences: 2 }),
        password: "member123",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 5. Create post that will be bookmarked by the member
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

  // 6. Create bookmark for the post
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

  // 7. Validate bookmark relationship integrity
  TestValidator.equals(
    "bookmark member ID matches authenticated member",
    member.id,
    bookmark.discussion_board_member_id,
  );

  TestValidator.equals(
    "bookmark post ID matches created post",
    post.id,
    bookmark.discussion_board_post_id,
  );

  TestValidator.equals(
    "bookmark member summary matches authenticated member",
    member.id,
    bookmark.member.id,
  );

  TestValidator.equals(
    "bookmark post summary matches created post",
    post.id,
    bookmark.post.id,
  );

  // 8. Test duplicate bookmark prevention
  await TestValidator.error(
    "duplicate bookmark creation should fail due to unique constraint",
    async () => {
      await api.functional.discussionBoard.member.members.bookmarks.postByMemberid(
        connection,
        {
          memberId: member.id,
          body: {
            discussion_board_post_id: post.id,
          } satisfies IDiscussionBoardUserBookmark.ICreate,
        },
      );
    },
  );
}
