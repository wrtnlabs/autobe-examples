import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test post retrieval by the original author who created the post.
 *
 * This scenario validates that members can access their own posts regardless of
 * post status (including draft posts). The test involves creating a post as a
 * member and then retrieving it using the same authenticated session. Validates
 * that all post details including draft status posts are accessible to their
 * creators.
 */
export async function test_api_post_retrieval_by_member_author(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a draft post
  // Using a valid UUID format for community ID that should work in test environment
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    post_type: "text" as const,
    status: "draft" as const,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // 3. Retrieve the created post
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);

  // 4. Validate post data matches
  TestValidator.equals(
    "post ID should match",
    retrievedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "post title should match",
    retrievedPost.title,
    createdPost.title,
  );
  TestValidator.equals(
    "post type should match",
    retrievedPost.post_type,
    createdPost.post_type,
  );
  TestValidator.equals(
    "post status should match",
    retrievedPost.status,
    createdPost.status,
  );
  TestValidator.equals(
    "community ID should match",
    retrievedPost.community_platform_community_id,
    createdPost.community_platform_community_id,
  );

  // 5. Validate draft post is accessible to author
  TestValidator.predicate(
    "draft post should be accessible to author",
    retrievedPost.status === "draft",
  );

  // 6. Validate community summary is included in response
  TestValidator.predicate(
    "community summary should be present",
    retrievedPost.community !== undefined,
  );
  TestValidator.predicate(
    "community should have valid ID",
    retrievedPost.community.id ===
      retrievedPost.community_platform_community_id,
  );
}
