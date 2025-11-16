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
 * Test retrieving a nested reply comment to verify parent-child relationship
 * data.
 *
 * This scenario validates that when retrieving a nested reply, the response
 * includes the parent_comment_id reference, correctly calculated depth value
 * (parent depth + 1), and all relationship metadata. The test verifies the
 * hierarchical comment structure retrieval for nested discussions.
 *
 * Test Flow:
 *
 * 1. Create moderator account for community management
 * 2. Create a community for threaded discussions
 * 3. Create member account for commenting
 * 4. Create a post to hold the comment thread
 * 5. Create parent comment (depth 0)
 * 6. Create nested reply to parent comment (depth 1)
 * 7. Retrieve the nested reply comment
 * 8. Validate parent_comment_id, depth, and relationship metadata
 */
export async function test_api_comment_retrieval_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for threaded discussions
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for commenting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a post to hold the comment thread
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create parent comment (top-level comment with depth 0)
  const parentComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Validate parent comment has depth 0 and no parent
  TestValidator.equals("parent comment depth is 0", parentComment.depth, 0);
  TestValidator.equals(
    "parent comment has no parent",
    parentComment.parent_comment_id,
    null,
  );

  // Step 6: Create nested reply to parent comment (depth 1)
  const nestedReply: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Step 7: Retrieve the nested reply comment
  const retrievedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: nestedReply.id,
    });
  typia.assert(retrievedComment);

  // Step 8: Validate parent-child relationship data
  TestValidator.equals(
    "retrieved comment ID matches created nested reply",
    retrievedComment.id,
    nestedReply.id,
  );

  TestValidator.equals(
    "parent_comment_id references parent comment",
    retrievedComment.parent_comment_id,
    parentComment.id,
  );

  TestValidator.equals(
    "depth is correctly calculated as parent depth + 1",
    retrievedComment.depth,
    parentComment.depth + 1,
  );

  TestValidator.equals(
    "depth equals 1 for first-level nested reply",
    retrievedComment.depth,
    1,
  );

  TestValidator.equals(
    "comment belongs to correct post",
    retrievedComment.reddit_community_post_id,
    post.id,
  );

  TestValidator.equals(
    "comment belongs to correct member",
    retrievedComment.reddit_community_member_id,
    member.id,
  );

  TestValidator.equals(
    "comment body content matches",
    retrievedComment.body,
    nestedReply.body,
  );

  TestValidator.equals(
    "comment is not edited initially",
    retrievedComment.edited,
    false,
  );

  TestValidator.equals(
    "comment is not deleted",
    retrievedComment.deleted_at,
    null,
  );
}
