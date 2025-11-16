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
 * Test filtering posts by content type (text, link, image).
 *
 * Creates posts of each type in a community, then retrieves posts filtered by
 * 'text' only, then 'link' only, then 'image' only. Verifies that each filter
 * returns only posts of the specified type and excludes other types. Validates
 * that content type filtering works in combination with pagination.
 *
 * 1. Create administrator account
 * 2. Create a category
 * 3. Create a member account
 * 4. Create a community
 * 5. Create posts of different types (text, link, image)
 * 6. Filter posts by type and verify results
 * 7. Test pagination with type filtering
 */
export async function test_api_community_posts_filter_by_post_type(
  connection: api.IConnection,
) {
  // 1. Create administrator account for setting up category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: "admin_" + RandomGenerator.alphabets(8),
        name: "Test Administrator",
        href: "https://localhost:3000",
        referrer: "https://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(6),
          description: "Technology related discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: "member_" + RandomGenerator.alphabets(8),
      password: "MemberPassword123!",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech-discussion-" + RandomGenerator.alphaNumeric(6),
          description: "A community for discussing technology topics",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create posts of different types
  // Create text posts
  const textPost1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "First Text Post",
        content_text:
          "This is a markdown formatted text post about technology.",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost1);

  const textPost2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Second Text Post",
        content_text:
          "Another interesting discussion about TypeScript and Node.js.",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost2);

  // Create link posts
  const linkPost1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Useful TypeScript Article",
        content_link_url: "https://www.typescriptlang.org/docs/handbook/",
        content_link_title: "TypeScript Handbook",
        content_link_description: "Official TypeScript documentation",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost1);

  const linkPost2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Web Development Best Practices",
        content_link_url: "https://developer.mozilla.org/en-US/docs/Web",
        content_link_title: "MDN Web Docs",
        content_link_description: "Comprehensive web development reference",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost2);

  // Create image posts
  const imagePost1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: "Network Architecture Diagram",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost1);

  const imagePost2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: "Database Schema Visualization",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost2);

  // 6. Filter posts by type and verify results
  // Filter for text posts only
  const textPostsPage =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(textPostsPage);
  TestValidator.equals("text posts count", textPostsPage.data.length, 2);
  TestValidator.predicate("all returned posts are text type", () =>
    textPostsPage.data.every((post) => post.post_type === "text"),
  );
  TestValidator.predicate("text post contains expected IDs", () =>
    textPostsPage.data.some((post) => post.id === textPost1.id),
  );

  // Filter for link posts only
  const linkPostsPage =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        post_type: "link",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(linkPostsPage);
  TestValidator.equals("link posts count", linkPostsPage.data.length, 2);
  TestValidator.predicate("all returned posts are link type", () =>
    linkPostsPage.data.every((post) => post.post_type === "link"),
  );
  TestValidator.predicate("link posts have URL content", () =>
    linkPostsPage.data.every(
      (post) =>
        post.content_link_url !== null && post.content_link_url !== undefined,
    ),
  );

  // Filter for image posts only
  const imagePostsPage =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        post_type: "image",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(imagePostsPage);
  TestValidator.equals("image posts count", imagePostsPage.data.length, 2);
  TestValidator.predicate("all returned posts are image type", () =>
    imagePostsPage.data.every((post) => post.post_type === "image"),
  );

  // 7. Test pagination with type filtering
  const firstPageTextPosts =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 1,
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(firstPageTextPosts);
  TestValidator.equals(
    "first page with limit 1 returns 1 post",
    firstPageTextPosts.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination info is correct",
    () => firstPageTextPosts.pagination.pages >= 2,
  );

  // Test filtering without type restriction returns all posts
  const allPostsPage =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(allPostsPage);
  TestValidator.equals("all posts without filter", allPostsPage.data.length, 6);
  TestValidator.predicate("all posts include different types", () => {
    const types = new Set(allPostsPage.data.map((p) => p.post_type));
    return types.has("text") && types.has("link") && types.has("image");
  });
}
