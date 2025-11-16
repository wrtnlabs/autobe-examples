import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_archived_visibility(
  connection: api.IConnection,
) {
  // Step 1: Set up admin account and create a category
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create a member account for post creator
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post with public visibility
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Verify initial post has public visibility
  TestValidator.equals(
    "initial post visibility status should be public",
    post.visibility_status,
    "public",
  );

  // Step 5: Update post visibility to archived
  const archivedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        visibility_status: "archived",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(archivedPost);

  // Step 7: Verify visibility status changed to archived in update response
  TestValidator.equals(
    "post visibility status should be archived after update",
    archivedPost.visibility_status,
    "archived",
  );

  // Step 6: Retrieve the archived post by ID
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);

  // Step 7: Validate visibility_status is archived
  TestValidator.equals(
    "retrieved post visibility status should be archived",
    retrievedPost.visibility_status,
    "archived",
  );

  // Step 8: Verify other post properties remain unchanged
  TestValidator.equals(
    "retrieved post title should match original",
    retrievedPost.title,
    post.title,
  );

  TestValidator.equals(
    "retrieved post content should match original",
    retrievedPost.content_text,
    post.content_text,
  );

  TestValidator.equals(
    "retrieved post community should match original",
    retrievedPost.community.id,
    community.id,
  );

  TestValidator.equals(
    "retrieved post creator should match original",
    retrievedPost.creator.id,
    post.creator.id,
  );

  TestValidator.equals(
    "retrieved post type should match original",
    retrievedPost.post_type,
    post.post_type,
  );

  // Step 9: Verify archived post is still in system with correct state
  TestValidator.predicate(
    "archived post should have valid ID",
    retrievedPost.id !== null && retrievedPost.id !== undefined,
  );

  TestValidator.predicate(
    "archived post should have creation timestamp",
    retrievedPost.created_at !== null && retrievedPost.created_at !== undefined,
  );

  TestValidator.predicate(
    "archived post should not have deletion timestamp",
    retrievedPost.deleted_at === null || retrievedPost.deleted_at === undefined,
  );
}
