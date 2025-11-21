import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful post creation workflow by an authenticated member user.
 *
 * This test validates that a member can:
 *
 * 1. Register and authenticate successfully
 * 2. Create a community for post association
 * 3. Create a new post with valid title, type, and status
 * 4. Verify system-generated fields and proper community association
 */
export async function test_api_post_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for post association
  const community =
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

  // Step 3: Create post with valid data
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    post_type: "text" as const,
    status: "published" as const,
    community_platform_community_id: community.id,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 4: Validate post creation results - focus on business logic
  TestValidator.equals(
    "created post title matches input",
    post.title,
    postData.title,
  );
  TestValidator.equals(
    "created post type matches input",
    post.post_type,
    postData.post_type,
  );
  TestValidator.equals(
    "created post status matches input",
    post.status,
    postData.status,
  );
  TestValidator.equals(
    "post is associated with correct community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post community summary matches created community",
    post.community.id,
    community.id,
  );
  TestValidator.predicate(
    "post has initialized engagement metrics",
    post.score === 0 && post.view_count === 0 && post.comment_count === 0,
  );
}
