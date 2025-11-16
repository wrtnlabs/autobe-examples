import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test member updating their own comment content.
 *
 * This test validates the complete workflow of a member updating their own
 * comment. It creates the necessary prerequisites (moderator, community,
 * member, post, comment) and then tests the comment update functionality,
 * verifying that the comment body is updated, the edited flag is set to true,
 * and the updated_at timestamp changes.
 *
 * Steps:
 *
 * 1. Moderator joins and creates a community
 * 2. Member joins the platform
 * 3. Member creates a post in the community
 * 4. Member creates a comment on the post
 * 5. Member updates the comment with new content
 * 6. Validate the updated comment has new body, edited flag is true, and
 *    timestamps are updated
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins and creates community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Member joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 3: Member creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Member creates a comment
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: originalCommentBody,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Validate initial comment state
  TestValidator.equals(
    "initial comment body matches",
    comment.body,
    originalCommentBody,
  );
  TestValidator.equals("initial edited flag is false", comment.edited, false);

  // Step 5: Member updates the comment
  const updatedCommentBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedCommentBody,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Validate updated comment
  TestValidator.equals(
    "comment ID remains the same",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "updated comment body matches new content",
    updatedComment.body,
    updatedCommentBody,
  );
  TestValidator.equals(
    "edited flag is set to true",
    updatedComment.edited,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedComment.updated_at,
    comment.created_at,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedComment.created_at,
    comment.created_at,
  );
}
