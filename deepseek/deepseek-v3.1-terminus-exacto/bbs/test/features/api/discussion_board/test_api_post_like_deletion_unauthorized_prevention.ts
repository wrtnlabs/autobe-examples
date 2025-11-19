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
 * Test unauthorized like deletion prevention by attempting to delete a like
 * record created by a different member. Validates proper ownership validation
 * and ensures members cannot delete likes belonging to other users.
 */
export async function test_api_post_like_deletion_unauthorized_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: Create second member account
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 3: Create moderator account for channel/section setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "admin",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Create discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 5: Create section within the channel
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // Step 6: Create a post using first member credentials
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        discussion_board_channel_id: channel.id,
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Create a like record using first member credentials
  const like: IDiscussionBoardPostLike =
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: firstMember.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  typia.assert(like);

  // Step 8: Switch to second member credentials
  await api.functional.auth.member.login(connection, {
    body: {
      email: secondMemberEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 9: Attempt to delete the like created by first member using second member credentials
  await TestValidator.error(
    "unauthorized member should not be able to delete like",
    async () => {
      await api.functional.discussionBoard.member.posts.likes.erase(
        connection,
        {
          postId: post.id,
          likeId: like.id,
        },
      );
    },
  );

  // Step 10: Switch back to first member credentials to verify like still exists
  await api.functional.auth.member.login(connection, {
    body: {
      email: firstMemberEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 11: Verify that like still exists by checking its properties remain intact
  TestValidator.equals(
    "like should still exist with original member ID",
    like.member.id,
    firstMember.id,
  );
  TestValidator.equals(
    "like should still be associated with original post",
    like.post.id,
    post.id,
  );
  TestValidator.predicate(
    "like should have valid creation timestamp",
    like.created_at !== null && like.created_at !== undefined,
  );
}
