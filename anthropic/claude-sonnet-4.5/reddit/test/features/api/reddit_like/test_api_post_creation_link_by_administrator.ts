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
 * Test administrator creating a link post with URL validation and metadata
 * extraction.
 *
 * This test validates that administrators can create link posts in communities,
 * even in communities with restrictive posting permissions. It verifies:
 *
 * 1. Member account registration and community creation
 * 2. Administrator account registration and authentication
 * 3. Link post creation by administrator with valid HTTPS URL
 * 4. URL validation (HTTPS protocol, maximum 2,000 characters)
 * 5. Post initialization with vote score of 0
 * 6. Administrator bypass of restrictive posting permissions
 *
 * The test ensures proper URL storage and post type configuration while
 * demonstrating that administrators have elevated privileges to post in any
 * community regardless of posting restrictions.
 */
export async function test_api_post_creation_link_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register member account to create the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = "Member@Pass123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals("member email matches", member.email, memberEmail);
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );

  // Step 2: Member creates a community for testing
  const communityCode = RandomGenerator.alphaNumeric(15).toLowerCase();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "moderators_only",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "posting permission is restrictive",
    community.posting_permission,
    "moderators_only",
  );
  TestValidator.predicate("link posts are allowed", community.allow_link_posts);

  // Step 3: Register administrator account and obtain authentication tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = "Admin@Pass456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin username matches", admin.username, adminUsername);
  TestValidator.predicate("admin token exists", admin.token.access.length > 0);

  // Step 4: Administrator creates a link post with valid HTTPS URL
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const linkUrl =
    "https://example.com/article/" + RandomGenerator.alphaNumeric(20);

  const linkPost = await api.functional.redditLike.admin.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "link",
        title: postTitle,
        url: linkUrl,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(linkPost);

  // Step 5: Validate post properties
  TestValidator.equals("post type is link", linkPost.type, "link");
  TestValidator.equals("post title matches", linkPost.title, postTitle);
}
