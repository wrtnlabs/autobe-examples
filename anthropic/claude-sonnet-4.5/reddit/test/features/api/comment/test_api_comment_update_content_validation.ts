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
 * Test comment update with various content validation scenarios.
 *
 * This test validates the comment update endpoint's content validation by:
 *
 * 1. Setting up the required dependencies (moderator, community, member, post,
 *    comment)
 * 2. Testing valid content updates at different lengths (normal, minimum, maximum)
 * 3. Verifying that the edited flag is set and timestamps are updated correctly
 * 4. Ensuring all valid content updates succeed with proper response structure
 */
export async function test_api_comment_update_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
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

  // Step 2: Create a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
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

  // Step 4: Create a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create initial comment
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: initialCommentBody,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify initial comment state
  TestValidator.equals("initial comment not edited", comment.edited, false);
  TestValidator.equals(
    "initial comment body",
    comment.body,
    initialCommentBody,
  );

  // Test Case 1: Update with normal valid content
  const normalContent = RandomGenerator.paragraph({ sentences: 10 });
  const updatedComment1 =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: normalContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment1);

  TestValidator.equals(
    "updated comment body matches normal content",
    updatedComment1.body,
    normalContent,
  );
  TestValidator.equals(
    "edited flag set to true after normal update",
    updatedComment1.edited,
    true,
  );
  TestValidator.equals(
    "comment ID unchanged after update",
    updatedComment1.id,
    comment.id,
  );
  TestValidator.equals(
    "comment belongs to correct post",
    updatedComment1.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author unchanged",
    updatedComment1.reddit_community_member_id,
    member.id,
  );
  TestValidator.predicate(
    "updated_at timestamp changed after normal update",
    new Date(updatedComment1.updated_at).getTime() >
      new Date(comment.created_at).getTime(),
  );

  // Test Case 2: Update with minimum length content (1 character)
  const minContent = "a";
  const updatedComment2 =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: minContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment2);

  TestValidator.equals(
    "updated comment body matches minimum content",
    updatedComment2.body,
    minContent,
  );
  TestValidator.equals(
    "edited flag remains true after minimum update",
    updatedComment2.edited,
    true,
  );
  TestValidator.equals(
    "minimum content length is 1",
    updatedComment2.body.length,
    1,
  );

  // Test Case 3: Update with maximum length content (10,000 characters)
  const maxContent = RandomGenerator.alphabets(10000);
  const updatedComment3 =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: maxContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment3);

  TestValidator.equals(
    "updated comment body matches maximum content",
    updatedComment3.body,
    maxContent,
  );
  TestValidator.equals(
    "maximum content length is 10000",
    updatedComment3.body.length,
    10000,
  );
  TestValidator.equals(
    "edited flag remains true after maximum update",
    updatedComment3.edited,
    true,
  );
  TestValidator.predicate(
    "updated_at timestamp reflects latest update",
    new Date(updatedComment3.updated_at).getTime() >
      new Date(updatedComment2.updated_at).getTime(),
  );
}
