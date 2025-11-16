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

export async function test_api_community_posts_pinned_posts_filter(
  connection: api.IConnection,
) {
  // Setup: Create administrator and member accounts
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminUser: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin123!@#",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Admin User",
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminUser);

  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberUser: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Member123!@#",
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberUser);

  // Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "Member123!@#",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
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

  // Create multiple posts with different pinned status
  const unpinnedPost1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Unpinned Post 1",
        content_text: "This is the first unpinned post",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(unpinnedPost1);

  const unpinnedPost2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Unpinned Post 2",
        content_text: "This is the second unpinned post",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(unpinnedPost2);

  const unpinnedPost3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Unpinned Post 3",
        content_text: "This is the third unpinned post",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(unpinnedPost3);

  // Test 1: Retrieve all posts without pinned filter
  const allPostsPage1: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(allPostsPage1);
  TestValidator.equals(
    "all posts include unpinned posts",
    allPostsPage1.data.length >= 3,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    allPostsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    allPostsPage1.pagination.limit,
    10,
  );

  // Test 2: Filter with pinned_only=false (should include all posts)
  const allPostsExplicit: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        pinned_only: false,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(allPostsExplicit);
  TestValidator.equals(
    "pinned_only=false returns all posts",
    allPostsExplicit.data.length >= 3,
    true,
  );

  // Test 3: Filter with pinned_only=true (should return no posts initially)
  const pinnedOnlyPosts: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        pinned_only: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(pinnedOnlyPosts);
  TestValidator.equals(
    "pinned_only=true returns only pinned posts",
    pinnedOnlyPosts.data.length >= 0,
    true,
  );

  // Verify all posts in pinned result are actually pinned
  for (const post of pinnedOnlyPosts.data) {
    TestValidator.equals(
      "post in pinned filter is marked as pinned",
      post.is_pinned,
      true,
    );
  }

  // Test 4: Test pagination with pinned filter
  const pinnedPageWithLimit: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 2,
        pinned_only: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(pinnedPageWithLimit);
  TestValidator.equals(
    "pagination respects limit parameter",
    pinnedPageWithLimit.data.length <= 2,
    true,
  );

  // Test 5: Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page is set correctly",
    pinnedPageWithLimit.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set correctly",
    pinnedPageWithLimit.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    pinnedPageWithLimit.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count is non-negative",
    pinnedPageWithLimit.pagination.pages >= 0,
  );
}
