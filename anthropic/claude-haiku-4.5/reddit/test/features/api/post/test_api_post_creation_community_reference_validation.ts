import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_creation_community_reference_validation(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account to set up the category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for communities
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account who will create communities and posts
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a valid community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech_discussion_" + RandomGenerator.alphaNumeric(6),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Test post creation with valid community_id (should succeed)
  const validPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post in Valid Community",
        content_text: RandomGenerator.content(),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(validPost);
  TestValidator.equals(
    "post community_id matches created community",
    validPost.community.id,
    community.id,
  );

  // Step 6: Test post creation with invalid/non-existent community_id (should fail)
  const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "post creation should fail with invalid community_id",
    async () => {
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: invalidCommunityId,
          post_type: "text",
          title: "Test Post in Invalid Community",
          content_text: RandomGenerator.content(),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );

  // Step 7: Create multiple posts in the same community
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Second Post in Valid Community",
        content_text: RandomGenerator.content(),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Link Post in Valid Community",
        content_link_url: "https://example.com",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  // Step 8: Verify all posts reference the same community
  TestValidator.equals(
    "post 1 community_id matches",
    validPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "post 2 community_id matches",
    post2.community.id,
    community.id,
  );
  TestValidator.equals(
    "post 3 community_id matches",
    post3.community.id,
    community.id,
  );

  // Step 9: Verify community information is correctly populated in posts
  TestValidator.equals(
    "post community identifier matches",
    validPost.community.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "post community name matches",
    validPost.community.name,
    community.name,
  );

  // Step 10: Verify post content matches what was submitted
  TestValidator.equals(
    "post title is preserved",
    validPost.title,
    "Test Post in Valid Community",
  );
  TestValidator.predicate(
    "post has correct type",
    validPost.post_type === "text",
  );

  // Step 11: Verify multiple posts exist and all reference the correct community
  TestValidator.predicate(
    "all posts belong to same community",
    validPost.community.id === post2.community.id &&
      post2.community.id === post3.community.id,
  );
}
