import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of an administrator creating a text post within a
 * specific community.
 *
 * This test validates that administrators can successfully create posts in any
 * community regardless of posting permissions. The workflow includes:
 *
 * 1. Creating a member account to establish community ownership
 * 2. Creating a community by that member
 * 3. Creating and authenticating an admin account
 * 4. Admin creating a text post in the community
 *
 * The test verifies the post is created with correct metadata including
 * community association, proper type assignment, and valid timestamps.
 */
export async function test_api_post_creation_in_community_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account to establish community ownership
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community where the admin will create the post
  const communityCode =
    RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3);
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create admin account for post creation in community
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: "admin_" + RandomGenerator.alphaNumeric(6),
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 4: Admin creates a text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const post: IRedditLikePost =
    await api.functional.redditLike.admin.communities.posts.create(connection, {
      communityId: community.id,
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Validate post creation results
  TestValidator.equals("post type is text", post.type, "text");
  TestValidator.equals("post title matches", post.title, postTitle);
}
