import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test complete post creation workflow for authenticated members.
 *
 * This test validates the end-to-end process of member registration,
 * authentication, and post creation with proper community association. It
 * ensures that posts are correctly created with all required fields, community
 * integration is properly established, and posts appear with appropriate
 * visibility settings.
 */
export async function test_api_member_post_creation_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://community-platform.example.com/register",
      referrer: "https://community-platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post with valid parameters
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    post_type: RandomGenerator.pick(["text", "link", "media", "poll"] as const),
    status: "published" as const,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformPost.ICreate;

  // Step 3: Create the post
  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 4: Validate post creation response
  TestValidator.equals(
    "post title should match input",
    createdPost.title,
    postData.title,
  );
  TestValidator.equals(
    "post type should match input",
    createdPost.post_type,
    postData.post_type,
  );
  TestValidator.equals(
    "post status should match input",
    createdPost.status,
    postData.status,
  );
  TestValidator.equals(
    "community ID should match input",
    createdPost.community_platform_community_id,
    postData.community_platform_community_id,
  );

  // Step 5: Validate system-generated fields
  TestValidator.equals("initial score should be 0", createdPost.score, 0);
  TestValidator.equals(
    "initial view count should be 0",
    createdPost.view_count,
    0,
  );
  TestValidator.equals(
    "initial comment count should be 0",
    createdPost.comment_count,
    0,
  );

  // Step 6: Validate community association
  TestValidator.equals(
    "community ID should match input",
    createdPost.community.id,
    postData.community_platform_community_id,
  );
  TestValidator.predicate(
    "community should have valid name structure",
    typeof createdPost.community.name === "string" &&
      createdPost.community.name.length > 0,
  );
  TestValidator.predicate(
    "community should have valid slug structure",
    typeof createdPost.community.slug === "string" &&
      createdPost.community.slug.length > 0,
  );
  TestValidator.predicate(
    "community should have valid status",
    ["active", "archived", "suspended", "pending"].includes(
      createdPost.community.status,
    ),
  );
  TestValidator.predicate(
    "community should have valid privacy setting",
    ["public", "private", "restricted"].includes(createdPost.community.privacy),
  );
}
