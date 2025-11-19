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
 * Test the complete workflow of a member deleting their own like record from a
 * discussion board post.
 *
 * This comprehensive test validates that authenticated members can remove their
 * engagement from posts they previously liked, while ensuring proper ownership
 * validation prevents unauthorized deletions. The test follows a realistic
 * business flow: creating a member account, setting up discussion board
 * infrastructure (channel and section), creating a post, creating a like
 * record, and then successfully deleting that like record. The scenario also
 * validates that members can only delete their own likes by attempting
 * unauthorized deletion operations.
 */
export async function test_api_post_like_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to set up discussion board infrastructure
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
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

  // Step 2: Create a discussion board channel
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create a section within the channel
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

  // Step 4: Create a member account that will perform the like operations
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "member123",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create a discussion board post
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

  // Step 6: Create a like record for the post (member_id comes from authentication)
  const like: IDiscussionBoardPostLike =
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: member.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  typia.assert(like);

  // Step 7: Validate that the like was created successfully
  TestValidator.equals(
    "like record contains correct member information",
    like.member.id,
    member.id,
  );
  TestValidator.equals(
    "like record contains correct post information",
    like.post.id,
    post.id,
  );

  // Step 8: Delete the like record
  await api.functional.discussionBoard.member.posts.likes.erase(connection, {
    postId: post.id,
    likeId: like.id,
  });

  // Step 9: Validate that the like cannot be deleted again (already deleted)
  await TestValidator.error("cannot delete already deleted like", async () => {
    await api.functional.discussionBoard.member.posts.likes.erase(connection, {
      postId: post.id,
      likeId: like.id,
    });
  });

  // Step 10: Create another member to test ownership validation
  const otherMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: "othermember123",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // Step 11: Switch to the other member's authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: otherMemberEmail,
      password: "othermember123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 12: Create a like for the other member
  const otherLike: IDiscussionBoardPostLike =
    await api.functional.discussionBoard.member.posts.likes.create(connection, {
      postId: post.id,
      body: {
        member_id: otherMember.id,
      } satisfies IDiscussionBoardPostLike.ICreate,
    });
  typia.assert(otherLike);

  // Step 13: Switch back to original member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 14: Validate that original member cannot delete other member's like
  await TestValidator.error(
    "member cannot delete other member's like",
    async () => {
      await api.functional.discussionBoard.member.posts.likes.erase(
        connection,
        {
          postId: post.id,
          likeId: otherLike.id,
        },
      );
    },
  );

  // Step 15: Switch back to other member to delete their own like
  await api.functional.auth.member.login(connection, {
    body: {
      email: otherMemberEmail,
      password: "othermember123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 16: Other member successfully deletes their own like
  await api.functional.discussionBoard.member.posts.likes.erase(connection, {
    postId: post.id,
    likeId: otherLike.id,
  });

  // Step 17: Final validation - ensure both likes were properly deleted
  await TestValidator.error("first like remains deleted", async () => {
    await api.functional.discussionBoard.member.posts.likes.erase(connection, {
      postId: post.id,
      likeId: like.id,
    });
  });

  await TestValidator.error("second like remains deleted", async () => {
    await api.functional.discussionBoard.member.posts.likes.erase(connection, {
      postId: post.id,
      likeId: otherLike.id,
    });
  });
}
