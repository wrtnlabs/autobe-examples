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
 * Test the complete workflow of creating nested reply comments in a discussion
 * thread.
 *
 * This scenario validates that authenticated members can successfully create
 * replies to existing comments, establishing parent-child relationships in the
 * comment hierarchy. The test verifies:
 *
 * 1. Moderator can create a community
 * 2. First member can create a post in that community
 * 3. First member can create a top-level comment on the post
 * 4. Second member can create a reply to that comment
 * 5. Reply correctly references the parent comment via parent_comment_id
 * 6. Reply inherits the post context
 * 7. Reply is assigned a unique comment ID
 * 8. Creation timestamp is set
 * 9. Depth field is calculated correctly (parent depth + 1)
 * 10. Authenticated member's ID is properly associated with the reply from JWT
 *     token
 */
export async function test_api_comment_reply_creation_nested_discussion(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member account
  const firstMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(firstMember);

  // Step 4: First member creates a post
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: First member creates a top-level comment
  const topLevelComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 6 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);

  // Validate top-level comment properties
  TestValidator.equals(
    "top-level comment post ID matches",
    topLevelComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment member ID matches first member",
    topLevelComment.reddit_community_member_id,
    firstMember.id,
  );
  TestValidator.equals(
    "top-level comment has null parent",
    topLevelComment.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.depth,
    0,
  );
  TestValidator.equals(
    "top-level comment is not edited initially",
    topLevelComment.edited,
    false,
  );
  TestValidator.equals(
    "top-level comment is not deleted",
    topLevelComment.deleted_at,
    null,
  );

  // Step 6: Create second member account
  const secondMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 4 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(secondMember);

  // Step 7: Second member creates a reply to the top-level comment
  const replyComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Step 8: Validate reply comment properties
  TestValidator.predicate(
    "reply comment ID is different from parent",
    replyComment.id !== topLevelComment.id,
  );

  TestValidator.equals(
    "reply correctly references parent comment",
    replyComment.parent_comment_id,
    topLevelComment.id,
  );

  TestValidator.equals(
    "reply inherits post context",
    replyComment.reddit_community_post_id,
    post.id,
  );

  TestValidator.equals(
    "reply is associated with second member",
    replyComment.reddit_community_member_id,
    secondMember.id,
  );

  TestValidator.equals(
    "reply depth is parent depth plus 1",
    replyComment.depth,
    topLevelComment.depth + 1,
  );

  TestValidator.equals("reply depth is exactly 1", replyComment.depth, 1);

  TestValidator.equals(
    "reply is not edited initially",
    replyComment.edited,
    false,
  );

  TestValidator.equals("reply is not deleted", replyComment.deleted_at, null);
}
