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

export async function test_api_community_posts_invalid_pagination_parameters(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin@1234",
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "Member@1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech_discussion_" + RandomGenerator.alphaNumeric(8),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create multiple posts (20 posts to test pagination)
  const posts = await ArrayUtil.asyncRepeat(20, async () => {
    return await api.functional.communityPlatform.member.posts.create(
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
  });
  posts.forEach((post) => typia.assert(post));

  // Test pagination at lower boundary: page=1, limit=1
  const page1Limit1 =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 limit 1 current page",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit 1 limit", page1Limit1.pagination.limit, 1);
  TestValidator.equals("page 1 limit 1 data count", page1Limit1.data.length, 1);
  TestValidator.predicate(
    "page 1 limit 1 has records",
    page1Limit1.pagination.records > 0,
  );

  // Test pagination: page=1, limit=10
  const page1Limit10 =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 limit 10 current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10 data exists",
    page1Limit10.data.length > 0,
  );
  TestValidator.predicate(
    "page 1 limit 10 has correct pagination info",
    page1Limit10.pagination.records === 20,
  );

  // Test pagination: page=2, limit=10
  const page2Limit10 =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page2Limit10);
  TestValidator.equals(
    "page 2 limit 10 current page",
    page2Limit10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 limit",
    page2Limit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 2 limit 10 data exists",
    page2Limit10.data.length > 0,
  );
  TestValidator.notEquals(
    "page 2 limit 10 different from page 1",
    page2Limit10.data[0].id,
    page1Limit10.data[0].id,
  );

  // Test pagination at upper boundary: page=1, limit=100 (maximum)
  const page1Limit100 =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page1Limit100);
  TestValidator.equals(
    "page 1 limit 100 limit",
    page1Limit100.pagination.limit,
    100,
  );
  TestValidator.equals(
    "page 1 limit 100 all posts",
    page1Limit100.data.length,
    20,
  );
  TestValidator.equals(
    "page 1 limit 100 pages",
    page1Limit100.pagination.pages,
    1,
  );

  // Test page exceeding available pages
  const exceedingPage =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 100,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(exceedingPage);
  TestValidator.equals(
    "exceeding page returns empty",
    exceedingPage.data.length,
    0,
  );
  TestValidator.equals(
    "exceeding page current page",
    exceedingPage.pagination.current,
    100,
  );
  TestValidator.equals(
    "exceeding page total records",
    exceedingPage.pagination.records,
    20,
  );

  // Test pagination correctness: verify pagination metadata
  TestValidator.predicate(
    "pagination pages calculated correctly",
    page1Limit10.pagination.pages ===
      Math.ceil(
        page1Limit10.pagination.records / page1Limit10.pagination.limit,
      ),
  );

  // Test pagination with different limit
  const page1Limit5 =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page1Limit5);
  TestValidator.equals("page 1 limit 5 data count", page1Limit5.data.length, 5);
  TestValidator.equals(
    "page 1 limit 5 total pages",
    page1Limit5.pagination.pages,
    4,
  );
}
