import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_update_visibility_to_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Tech discussion community",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community for the post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News Discussion",
          identifier: RandomGenerator.alphabets(6),
          description: "Discussing latest tech news",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post with visible content
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Interesting Technology Update",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Validate initial post state
  TestValidator.equals(
    "initial visibility is public",
    post.visibility_status,
    "public",
  );
  TestValidator.predicate(
    "initial deleted_at is not set",
    post.deleted_at == null,
  );

  // Step 6: Update post visibility to 'deleted' (soft-delete)
  const deletedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        visibility_status: "deleted",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(deletedPost);

  // Step 7 & 8: Verify soft-delete was successful
  TestValidator.equals(
    "visibility_status changed to deleted",
    deletedPost.visibility_status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedPost.deleted_at != null,
  );

  // Step 9: Validate post data is preserved for audit trail
  TestValidator.equals("post title preserved", deletedPost.title, post.title);
  TestValidator.equals(
    "post creator preserved",
    deletedPost.creator.id,
    post.creator.id,
  );
  TestValidator.equals(
    "post community preserved",
    deletedPost.community.id,
    post.community.id,
  );

  // Step 10: Verify engagement metrics are maintained
  TestValidator.equals(
    "post content preserved in soft-delete",
    deletedPost.content_text,
    post.content_text,
  );
  TestValidator.equals(
    "vote counts preserved",
    deletedPost.vote_score,
    post.vote_score,
  );
}
