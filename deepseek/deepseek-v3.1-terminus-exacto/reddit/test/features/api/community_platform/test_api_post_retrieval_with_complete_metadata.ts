import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test comprehensive post retrieval including all metadata fields.
 *
 * This scenario validates that the post retrieval operation returns complete
 * post information including community context, engagement metrics, and
 * system-generated timestamps. The test involves creating a post with specific
 * attributes and verifying that all metadata fields are properly populated and
 * returned in the response.
 */
export async function test_api_post_retrieval_with_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a post with comprehensive metadata
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    post_type: "text" as const,
    status: "published" as const,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 3: Retrieve the post using its ID
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);

  // Step 4: Validate all metadata fields
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("title matches", retrievedPost.title, postData.title);
  TestValidator.equals(
    "post type matches",
    retrievedPost.post_type,
    postData.post_type,
  );
  TestValidator.equals("status matches", retrievedPost.status, postData.status);

  // Validate engagement metrics are properly initialized
  TestValidator.equals("score is initialized to 0", retrievedPost.score, 0);
  TestValidator.equals(
    "view count is initialized to 0",
    retrievedPost.view_count,
    0,
  );
  TestValidator.equals(
    "comment count is initialized to 0",
    retrievedPost.comment_count,
    0,
  );

  // Validate timestamps with more flexible regex
  TestValidator.predicate(
    "created_at is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
      retrievedPost.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
      retrievedPost.updated_at,
    ),
  );

  // Validate community association
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community_platform_community_id,
    postData.community_platform_community_id,
  );

  // Validate community summary structure
  TestValidator.predicate(
    "community has ID",
    typeof retrievedPost.community.id === "string" &&
      retrievedPost.community.id.length > 0,
  );
  TestValidator.predicate(
    "community has name",
    typeof retrievedPost.community.name === "string" &&
      retrievedPost.community.name.length > 0,
  );
  TestValidator.predicate(
    "community has slug",
    typeof retrievedPost.community.slug === "string" &&
      retrievedPost.community.slug.length > 0,
  );
  TestValidator.predicate(
    "community has valid status",
    ["active", "archived", "suspended", "pending"].includes(
      retrievedPost.community.status,
    ),
  );
  TestValidator.predicate(
    "community has valid privacy",
    ["public", "private", "restricted"].includes(
      retrievedPost.community.privacy,
    ),
  );
  TestValidator.predicate(
    "community has created_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
      retrievedPost.community.created_at,
    ),
  );

  // Validate soft deletion field is undefined for active post
  TestValidator.equals(
    "deleted_at is undefined for active post",
    retrievedPost.deleted_at,
    undefined,
  );
}
