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
 * Test creating a nested reply to an existing comment, establishing a threaded
 * discussion structure.
 *
 * This test validates the reply functionality where members respond to other
 * comments creating multi-level conversation threads. The test creates a parent
 * comment first, then creates a reply with parent_comment_id referencing the
 * parent. It verifies that depth is correctly calculated as parent depth + 1,
 * the parent-child relationship is properly established, and the nested
 * structure supports threaded discussion displays.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator and create community
 * 2. Switch to member authentication
 * 3. Create a post in the community
 * 4. Create a parent comment (top-level, depth 0)
 * 5. Create a nested reply to the parent comment
 * 6. Validate depth calculation (should be 1)
 * 7. Validate parent-child relationship is correct
 * 8. Verify threading metadata is properly maintained
 */
export async function test_api_comment_creation_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator and create community
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
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

  // Step 2: Switch to member authentication
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 4: Create parent comment (top-level comment, depth 0)
  const parentCommentData = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentData,
      },
    );
  typia.assert(parentComment);

  // Validate parent comment properties
  TestValidator.equals(
    "parent comment depth should be 0",
    parentComment.depth,
    0,
  );
  TestValidator.equals(
    "parent comment should have null parent_comment_id",
    parentComment.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "parent comment should belong to the post",
    parentComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "parent comment should belong to the member",
    parentComment.reddit_community_member_id,
    member.id,
  );

  // Step 5: Create nested reply to the parent comment
  const nestedReplyData = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parent_comment_id: parentComment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const nestedReply =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: nestedReplyData,
      },
    );
  typia.assert(nestedReply);

  // Step 6-8: Validate nested reply properties
  TestValidator.equals("nested reply depth should be 1", nestedReply.depth, 1);
  TestValidator.equals(
    "nested reply parent_comment_id should reference parent",
    nestedReply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "nested reply should belong to the same post",
    nestedReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "nested reply should belong to the member",
    nestedReply.reddit_community_member_id,
    member.id,
  );
  TestValidator.predicate(
    "nested reply should not be edited initially",
    nestedReply.edited === false,
  );
  TestValidator.predicate(
    "nested reply should not be deleted",
    nestedReply.deleted_at === null,
  );
}
