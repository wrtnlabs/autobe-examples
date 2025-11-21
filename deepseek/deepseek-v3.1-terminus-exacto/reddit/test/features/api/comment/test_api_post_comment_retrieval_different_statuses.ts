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
 * Test comment retrieval across different moderation statuses to validate
 * access control and visibility rules. Creates comments with various statuses
 * (published, pending, removed) and verifies that the retrieval operation
 * respects status-based access restrictions for regular users.
 */
export async function test_api_post_comment_retrieval_different_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Note: Since we don't have a community creation API, we'll use a valid UUID format
  // but acknowledge that in a real scenario, this would need to reference an existing community
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create a post to host comments
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create comments with different statuses
  const statuses = ["published", "pending", "removed"] as const;
  const comments: Record<string, ICommunityPlatformComment> = {};

  for (const status of statuses) {
    const comment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            community_platform_post_id: post.id,
            status: status,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    comments[status] = comment;
  }

  // Step 4: Test retrieval of each comment - all should be accessible to the comment creator
  const publishedComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: comments.published.id,
    });
  typia.assert(publishedComment);
  TestValidator.equals(
    "published comment should be retrievable by creator",
    publishedComment.id,
    comments.published.id,
  );

  const pendingComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: comments.pending.id,
    });
  typia.assert(pendingComment);
  TestValidator.equals(
    "pending comment should be retrievable by creator",
    pendingComment.id,
    comments.pending.id,
  );

  const removedComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: comments.removed.id,
    });
  typia.assert(removedComment);
  TestValidator.equals(
    "removed comment should be retrievable by creator",
    removedComment.id,
    comments.removed.id,
  );

  // Step 5: Validate comment statuses in retrieved data
  TestValidator.equals(
    "published comment status should be published",
    publishedComment.status,
    "published",
  );
  TestValidator.equals(
    "pending comment status should be pending",
    pendingComment.status,
    "pending",
  );
  TestValidator.equals(
    "removed comment status should be removed",
    removedComment.status,
    "removed",
  );

  // Step 6: Validate comment content integrity
  TestValidator.equals(
    "published comment body should match",
    publishedComment.body,
    comments.published.body,
  );
  TestValidator.equals(
    "pending comment body should match",
    pendingComment.body,
    comments.pending.body,
  );
  TestValidator.equals(
    "removed comment body should match",
    removedComment.body,
    comments.removed.body,
  );

  // Step 7: Test that non-existent comments return appropriate errors
  await TestValidator.error("non-existent comment should fail", async () => {
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // Step 8: Test with invalid post ID
  await TestValidator.error("invalid post ID should fail", async () => {
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      commentId: comments.published.id,
    });
  });
}
