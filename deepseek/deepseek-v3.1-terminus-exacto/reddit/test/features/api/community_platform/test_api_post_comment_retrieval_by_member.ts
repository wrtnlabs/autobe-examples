import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test individual comment retrieval functionality for authenticated members.
 *
 * This test validates the complete workflow of comment retrieval:
 *
 * 1. Member registration and authentication
 * 2. Post creation in community context
 * 3. Comment creation with realistic content
 * 4. Individual comment retrieval by ID
 * 5. Comprehensive validation of returned comment data
 *
 * The test ensures proper data relationships, authentication handling, and
 * complete comment information including content, status, metrics, and
 * contextual post information.
 */
export async function test_api_post_comment_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post for the comment
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 2 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 4: Retrieve the specific comment
  const retrievedComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Comprehensive validation of retrieved comment data
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    comment.body,
  );
  TestValidator.equals(
    "comment status matches",
    retrievedComment.status,
    comment.status,
  );
  TestValidator.equals(
    "post ID matches",
    retrievedComment.community_platform_post_id,
    post.id,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedComment.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedComment.created_at),
  );

  // Validate metrics
  TestValidator.predicate(
    "score is defined",
    retrievedComment.score !== undefined,
  );
  TestValidator.predicate(
    "reply_count is defined",
    retrievedComment.reply_count !== undefined,
  );
  TestValidator.predicate(
    "reply_count is non-negative",
    retrievedComment.reply_count >= 0,
  );

  // Validate post context
  TestValidator.equals(
    "post context ID matches",
    retrievedComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "post context title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.predicate(
    "post context has author",
    retrievedComment.post.author !== undefined,
  );
  TestValidator.predicate(
    "post context has community",
    retrievedComment.post.community !== undefined,
  );
  TestValidator.predicate(
    "post context has post_type",
    retrievedComment.post.post_type !== undefined,
  );
  TestValidator.predicate(
    "post context has status",
    retrievedComment.post.status !== undefined,
  );
  TestValidator.predicate(
    "post context has score",
    retrievedComment.post.score !== undefined,
  );
  TestValidator.predicate(
    "post context has view_count",
    retrievedComment.post.view_count !== undefined,
  );
  TestValidator.predicate(
    "post context has created_at",
    retrievedComment.post.created_at !== undefined,
  );
  TestValidator.predicate(
    "post context has updated_at",
    retrievedComment.post.updated_at !== undefined,
  );

  // Validate author context in post
  TestValidator.predicate(
    "post author has id",
    retrievedComment.post.author.id !== undefined,
  );
  TestValidator.predicate(
    "post author has email",
    retrievedComment.post.author.email !== undefined,
  );
  TestValidator.predicate(
    "post author has display_name",
    retrievedComment.post.author.display_name !== undefined,
  );
  TestValidator.predicate(
    "post author has karma_score",
    retrievedComment.post.author.karma_score !== undefined,
  );
  TestValidator.predicate(
    "post author has is_verified",
    retrievedComment.post.author.is_verified !== undefined,
  );
  TestValidator.predicate(
    "post author has last_active_at",
    retrievedComment.post.author.last_active_at !== undefined,
  );
  TestValidator.predicate(
    "post author has created_at",
    retrievedComment.post.author.created_at !== undefined,
  );

  // Validate community context in post
  TestValidator.predicate(
    "post community has id",
    retrievedComment.post.community.id !== undefined,
  );
  TestValidator.predicate(
    "post community has name",
    retrievedComment.post.community.name !== undefined,
  );
  TestValidator.predicate(
    "post community has slug",
    retrievedComment.post.community.slug !== undefined,
  );
  TestValidator.predicate(
    "post community has status",
    retrievedComment.post.community.status !== undefined,
  );
  TestValidator.predicate(
    "post community has privacy",
    retrievedComment.post.community.privacy !== undefined,
  );
  TestValidator.predicate(
    "post community has created_at",
    retrievedComment.post.community.created_at !== undefined,
  );
}
