import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostLike";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";

/**
 * Test duplicate like prevention for discussion board posts.
 *
 * This test validates that the system properly enforces the unique constraint
 * preventing members from liking the same post multiple times. The scenario
 * creates all necessary prerequisites including moderator and member accounts,
 * discussion board channel and section, and a test post. It then attempts to
 * create duplicate like records for the same post by the same member, expecting
 * appropriate error handling for constraint violations.
 */
export async function test_api_post_like_creation_duplicate_prevention(
  connection: api.IConnection,
) {
  // 1. Create moderator account for administrative operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        password: "moderator123",
        moderation_level: "basic",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
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

  // 4. Create member account for liking operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        password: "member123",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 5. Create a post for the member to like
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 6. Create the first like record (should succeed)
  const firstLike: IDiscussionBoardPostLike =
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: member.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  typia.assert(firstLike);

  // 7. Attempt to create duplicate like (should fail)
  await TestValidator.error("duplicate like creation should fail", async () => {
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: member.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  });

  // 8. Validate that only one like record exists for this member-post combination
  TestValidator.equals(
    "member ID matches in like record",
    firstLike.member.id,
    member.id,
  );
  TestValidator.equals(
    "post ID matches in like record",
    firstLike.post.id,
    post.id,
  );
}
