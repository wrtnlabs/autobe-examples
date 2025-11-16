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
 * Test creating deeply nested comment threads with multiple depth levels.
 *
 * This test validates that the Reddit community platform supports unlimited
 * comment nesting by creating a chain of nested replies spanning multiple depth
 * levels (depth 0 through depth 4). It verifies:
 *
 * 1. Depth 0: Top-level comment directly on the post
 * 2. Depth 1: Reply to the top-level comment
 * 3. Depth 2: Reply to the depth 1 comment
 * 4. Depth 3: Reply to the depth 2 comment
 * 5. Depth 4: Reply to the depth 3 comment
 *
 * At each level, the test confirms that:
 *
 * - The depth field is correctly calculated
 * - Parent-child relationships are properly maintained
 * - The parent_comment_id correctly references the parent comment
 *
 * This ensures rich threaded discussions can develop naturally without
 * artificial depth limits.
 */
export async function test_api_comment_creation_multiple_depth_levels(
  connection: api.IConnection,
) {
  // Step 1: Register moderator to create community
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Register member to create post and comments
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
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
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Create depth 0 comment (top-level comment on post)
  const depth0CommentData = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const depth0Comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: depth0CommentData,
      },
    );
  typia.assert(depth0Comment);
  TestValidator.equals("depth 0 comment has depth 0", depth0Comment.depth, 0);
  TestValidator.equals(
    "depth 0 comment has no parent",
    depth0Comment.parent_comment_id,
    null,
  );

  // Step 6: Create depth 1 comment (reply to depth 0)
  const depth1CommentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: depth0Comment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const depth1Comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: depth1CommentData,
      },
    );
  typia.assert(depth1Comment);
  TestValidator.equals("depth 1 comment has depth 1", depth1Comment.depth, 1);
  TestValidator.equals(
    "depth 1 parent is depth 0",
    depth1Comment.parent_comment_id,
    depth0Comment.id,
  );

  // Step 7: Create depth 2 comment (reply to depth 1)
  const depth2CommentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: depth1Comment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const depth2Comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: depth2CommentData,
      },
    );
  typia.assert(depth2Comment);
  TestValidator.equals("depth 2 comment has depth 2", depth2Comment.depth, 2);
  TestValidator.equals(
    "depth 2 parent is depth 1",
    depth2Comment.parent_comment_id,
    depth1Comment.id,
  );

  // Step 8: Create depth 3 comment (reply to depth 2)
  const depth3CommentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: depth2Comment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const depth3Comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: depth3CommentData,
      },
    );
  typia.assert(depth3Comment);
  TestValidator.equals("depth 3 comment has depth 3", depth3Comment.depth, 3);
  TestValidator.equals(
    "depth 3 parent is depth 2",
    depth3Comment.parent_comment_id,
    depth2Comment.id,
  );

  // Step 9: Create depth 4 comment (reply to depth 3) to prove deep nesting
  const depth4CommentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: depth3Comment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const depth4Comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: depth4CommentData,
      },
    );
  typia.assert(depth4Comment);
  TestValidator.equals("depth 4 comment has depth 4", depth4Comment.depth, 4);
  TestValidator.equals(
    "depth 4 parent is depth 3",
    depth4Comment.parent_comment_id,
    depth3Comment.id,
  );

  // Validate the complete chain integrity
  TestValidator.predicate(
    "comment chain maintains proper depth progression",
    depth0Comment.depth === 0 &&
      depth1Comment.depth === 1 &&
      depth2Comment.depth === 2 &&
      depth3Comment.depth === 3 &&
      depth4Comment.depth === 4,
  );
}
