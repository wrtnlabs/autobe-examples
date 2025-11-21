import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test individual comment retrieval by unique identifier.
 *
 * This E2E test validates the complete workflow of retrieving a specific
 * comment by its ID through the GET /communityPlatform/comments/{commentId}
 * endpoint. The test follows a comprehensive setup process including member
 * authentication, community creation, post creation, comment creation, and
 * finally comment retrieval with full validation of all returned properties.
 */
export async function test_api_comment_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Member Authentication: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Community Creation: Create a community to host the post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Post Creation: Create a post within the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Comment Creation: Create a target comment with rich content
  const commentBody = RandomGenerator.content({ paragraphs: 2 });
  const createdComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: commentBody,
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(createdComment);

  // 5. Comment Retrieval: Retrieve the comment using the specific ID endpoint
  const retrievedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.comments.at(connection, {
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // 6. Validation: Verify that all comment properties match the created data
  TestValidator.equals(
    "comment ID should match created comment ID",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment body content should match original content",
    retrievedComment.body,
    createdComment.body,
  );
  TestValidator.equals(
    "comment status should remain published",
    retrievedComment.status,
    createdComment.status,
  );
  TestValidator.equals(
    "post ID association should be maintained",
    retrievedComment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply count should be zero for newly created comment",
    retrievedComment.reply_count,
    0,
  );
  TestValidator.predicate(
    "created_at timestamp should exist",
    retrievedComment.created_at !== null &&
      retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should exist",
    retrievedComment.updated_at !== null &&
      retrievedComment.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should be undefined for active comment",
    retrievedComment.deleted_at,
    undefined,
  );

  // Validate post association
  TestValidator.equals(
    "post association ID should match original post",
    retrievedComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "post title should match original post title",
    retrievedComment.post.title,
    post.title,
  );
}
