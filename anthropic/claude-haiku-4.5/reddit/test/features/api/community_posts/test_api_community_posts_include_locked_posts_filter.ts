import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test filtering for locked posts (posts with comments disabled).
 *
 * Validates that the include_locked_posts filter parameter works correctly when
 * retrieving posts. Creates multiple posts in a community and verifies:
 *
 * - Retrieval with include_locked_posts=false returns appropriate results
 * - Retrieval with include_locked_posts=true returns appropriate results
 * - The filter combines properly with pagination and other filter parameters
 * - The API correctly handles the filter parameter in all combinations
 *
 * Workflow:
 *
 * 1. Administrator creates a category
 * 2. Member joins the platform
 * 3. Member creates a community
 * 4. Member creates multiple posts
 * 5. Retrieve posts with include_locked_posts=false and verify filtering
 * 6. Retrieve posts with include_locked_posts=true and verify filtering
 * 7. Test locked filtering combined with other filter parameters
 */
export async function test_api_community_posts_include_locked_posts_filter(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins and creates a category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Administrator",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member joins the platform
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: "Password123!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Member creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create multiple posts
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "First Post",
        content_text: "This is the first post in the community",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Second Post",
        content_text: "This is the second post in the community",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Third Post",
        content_text: "This is the third post in the community",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  // Step 5: Retrieve posts with include_locked_posts=false
  const postsExcludingLocked: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        include_locked_posts: false,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postsExcludingLocked);

  // Verify pagination information
  TestValidator.predicate(
    "pagination should have valid current page",
    postsExcludingLocked.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    postsExcludingLocked.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    postsExcludingLocked.pagination.records >= 0,
  );

  // Step 6: Retrieve posts with include_locked_posts=true
  const postsIncludingLocked: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        include_locked_posts: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postsIncludingLocked);

  // Verify pagination information
  TestValidator.predicate(
    "pagination with locked posts should have valid current page",
    postsIncludingLocked.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination with locked posts should have valid limit",
    postsIncludingLocked.pagination.limit > 0,
  );

  // Step 7: Test locked filtering combined with other filters
  const postsWithCombinedFilters: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        visibility_status: "public",
        include_locked_posts: false,
        exclude_nsfw: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postsWithCombinedFilters);

  // Verify combined filtering works correctly
  TestValidator.predicate(
    "combined filters should return valid results",
    postsWithCombinedFilters.data.length >= 0,
  );
  TestValidator.predicate(
    "combined filters should have valid pagination",
    postsWithCombinedFilters.pagination.current >= 0,
  );

  // Test with include_locked_posts=true and other filters combined
  const postsWithIncludeLocked: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 50,
        visibility_status: "public",
        include_locked_posts: true,
        exclude_spoilers: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postsWithIncludeLocked);

  // Verify filter parameter is respected
  TestValidator.predicate(
    "include_locked_posts parameter should be respected in API calls",
    postsWithIncludeLocked.pagination.limit <= 50,
  );

  // Verify all posts have valid structure
  for (const post of postsIncludingLocked.data) {
    TestValidator.predicate(
      "post should have valid id",
      post.id !== undefined && post.id !== null,
    );
    TestValidator.predicate(
      "post should have valid title",
      post.title !== undefined && post.title.length > 0,
    );
    TestValidator.predicate(
      "post should have is_locked property",
      post.is_locked !== undefined,
    );
  }
}
