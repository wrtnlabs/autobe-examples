import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test administrator comment removal with appeal context preservation.
 *
 * This test validates that when an administrator removes a member's comment,
 * the system preserves complete context for the appeal review process
 * including:
 *
 * - Detailed platform policy violation reasoning
 * - Internal notes for admin team reference
 * - Original comment content in database for appeal review
 * - Complete audit trail for appeal adjudication
 *
 * Test workflow:
 *
 * 1. Create administrator account
 * 2. Create member account for content creation
 * 3. Create community for comment context
 * 4. Create post for comment placement
 * 5. Create comment as admin (simulating violating content)
 * 6. Remove comment with detailed reasoning and internal notes
 * 7. Verify removal completes successfully
 */
export async function test_api_admin_comment_removal_with_appeal_context_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community as member
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 7,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Create comment as admin (simulating content that will be removed)
  const comment = await api.functional.redditLike.admin.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 6: Remove the comment with detailed reasoning and internal notes
  await api.functional.redditLike.admin.comments.remove(connection, {
    commentId: comment.id,
    body: {
      removal_type: RandomGenerator.pick([
        "community",
        "platform",
        "spam",
      ] as const),
      reason_category: RandomGenerator.pick([
        "harassment",
        "hate_speech",
        "spam",
        "misinformation",
        "violence",
      ] as const),
      reason_text: RandomGenerator.paragraph({
        sentences: 8,
        wordMin: 5,
        wordMax: 10,
      }),
      internal_notes: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 12,
      }),
    } satisfies IRedditLikeComment.IRemove,
  });

  // Step 7: Removal completed successfully - void return indicates success
}
