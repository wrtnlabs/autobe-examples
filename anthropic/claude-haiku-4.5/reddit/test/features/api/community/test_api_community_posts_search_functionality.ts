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

export async function test_api_community_posts_search_functionality(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin connection
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 2. Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member connection
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "TypeScript Discussions",
          identifier: "typescript_discussions",
          description: "Community for TypeScript programming discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create multiple posts with distinct keywords for searching
  const searchKeywords = [
    {
      title: "TypeScript Best Practices",
      content: "Learn about TypeScript type system and best practices",
    },
    {
      title: "JavaScript Performance Tips",
      content: "Optimize your JavaScript code for better performance",
    },
    {
      title: "React Hooks Tutorial",
      content: "Complete guide to React hooks and state management",
    },
    {
      title: "Node.js Backend Development",
      content: "Building scalable Node.js applications with Express",
    },
    {
      title: "Database Design Patterns",
      content: "SQL and NoSQL database design best practices",
    },
  ];

  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncMap(
    searchKeywords,
    async (keyword) =>
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: keyword.title,
          content_text: keyword.content,
        } satisfies ICommunityPlatformPost.ICreate,
      }),
  );

  await ArrayUtil.asyncForEach(createdPosts, async (post) => {
    typia.assert(post);
  });

  // 6. Test basic search functionality with single keyword
  const typeScriptSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "TypeScript",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(typeScriptSearch);
  TestValidator.predicate(
    "TypeScript search should return results",
    typeScriptSearch.data.length > 0,
  );
  TestValidator.predicate(
    "First result should be TypeScript Best Practices",
    typeScriptSearch.data[0].title.includes("TypeScript"),
  );

  // 7. Test case-insensitive search
  const caseInsensitiveSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "typescript",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(caseInsensitiveSearch);
  TestValidator.equals(
    "Case-insensitive search should return same results",
    typeScriptSearch.data.length,
    caseInsensitiveSearch.data.length,
  );

  // 8. Test partial matching
  const partialSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "Script",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(partialSearch);
  TestValidator.predicate(
    "Partial match 'Script' should find JavaScript and TypeScript posts",
    partialSearch.data.length > 0,
  );

  // 9. Test multi-word search
  const multiWordSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "Best Practices",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(multiWordSearch);
  TestValidator.predicate(
    "Multi-word search should return relevant results",
    multiWordSearch.data.length > 0,
  );

  // 10. Test pagination with search
  const paginatedSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 2,
        search: "a",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "Paginated search should respect limit",
    paginatedSearch.data.length <= 2,
  );
  TestValidator.predicate(
    "Pagination should provide page information",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 2,
  );

  // 11. Test search with visibility filter
  const visibilityFilteredSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "TypeScript",
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(visibilityFilteredSearch);
  TestValidator.predicate(
    "Filtered search should only return public posts",
    visibilityFilteredSearch.data.every(
      (post) => post.visibility_status === "public",
    ),
  );

  // 12. Test search with post type filter
  const typeFilteredSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "development",
        post_type: "text",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(typeFilteredSearch);
  TestValidator.predicate(
    "Filtered search should only return text posts",
    typeFilteredSearch.data.every((post) => post.post_type === "text"),
  );

  // 13. Test search with NSFW filter
  const nsfwFilteredSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "performance",
        exclude_nsfw: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(nsfwFilteredSearch);
  TestValidator.predicate(
    "NSFW filter should exclude NSFW posts",
    nsfwFilteredSearch.data.every((post) => !post.is_nsfw),
  );

  // 14. Test search with sorting
  const sortedSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "a",
        sort_by: "createdAt",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(sortedSearch);
  TestValidator.predicate(
    "Sorted search should return results",
    sortedSearch.data.length > 0,
  );

  // 15. Test search with no results
  const noResultsSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "nonexistentKeyword12345",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(noResultsSearch);
  TestValidator.equals(
    "Search with no matching keywords should return empty results",
    noResultsSearch.data.length,
    0,
  );

  // 16. Test search combined with vote score filter
  const voteScoreSearch: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        search: "development",
        min_vote_score: 0,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(voteScoreSearch);
  TestValidator.predicate(
    "Vote score filtered search should only include posts meeting criteria",
    voteScoreSearch.data.every((post) => post.vote_score >= 0),
  );
}
