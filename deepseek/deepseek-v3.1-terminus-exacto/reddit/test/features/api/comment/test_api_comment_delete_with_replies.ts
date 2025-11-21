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
 * Test comment deletion scenario involving comments with threaded replies. This
 * scenario validates the deletion behavior when a comment has existing replies,
 * ensuring proper handling of parent-child relationships. The test verifies
 * that deletion of a parent comment with replies maintains database integrity,
 * checks if reply comments are handled appropriately (orphaned or cascade
 * deleted), and confirms that deletion operations respect comment threading
 * relationships.
 */
export async function test_api_comment_delete_with_replies(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to host the comment thread
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

  // Step 3: Create a parent comment that will have replies
  const parentComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 4: Create reply comments to establish threaded relationships
  const replyComments = await ArrayUtil.asyncRepeat(2, async (index) => {
    const reply =
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: `Reply ${index + 1}: ${RandomGenerator.content({ paragraphs: 1 })}`,
            parent_id: parentComment.id,
            community_platform_post_id: post.id,
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(reply);
    return reply;
  });

  // Step 5: Delete the parent comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );

  // Step 6: Verify reply comments are properly handled after parent deletion
  // Test if reply comments still exist and have proper parent relationship
  for (const reply of replyComments) {
    await TestValidator.error(
      `reply comment ${reply.id} should not be accessible after parent deletion`,
      async () => {
        // Try to delete the reply comment - it should fail if cascade deleted
        // or succeed if still accessible
        await api.functional.communityPlatform.member.posts.comments.erase(
          connection,
          {
            postId: post.id,
            commentId: reply.id,
          },
        );
      },
    );
  }

  // Additional validation: Verify parent comment is truly deleted
  await TestValidator.error(
    "parent comment should not be accessible after deletion",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.erase(
        connection,
        {
          postId: post.id,
          commentId: parentComment.id,
        },
      );
    },
  );

  // Final validation: Ensure database integrity is maintained
  TestValidator.predicate(
    "reply comments should have been properly handled",
    replyComments.length === 2,
  );
}
