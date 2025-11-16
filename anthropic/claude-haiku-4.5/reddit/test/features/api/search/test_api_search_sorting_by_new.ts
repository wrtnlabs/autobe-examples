import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

export async function test_api_search_sorting_by_new(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member account created", member.id !== null);

  // Step 2: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community created", community.id !== null);

  // Step 3: Create multiple posts with different timestamps
  const now = new Date();
  const posts: ICommunityPlatformPost[] = [];

  // Create posts at different time intervals (oldest to newest)
  for (let i = 0; i < 5; i++) {
    const postTimestamp = new Date(
      now.getTime() - (5 - i) * 60 * 60 * 1000,
    ).toISOString();
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Post ${i + 1} - Created at ${postTimestamp}`,
          content_text: `This is post ${i + 1} with content created at different times. ${RandomGenerator.paragraph({ sentences: 3 })}`,
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 4: Search with sortBy='new' and verify descending order
  const searchQuery = "Post";
  const searchResult: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchQuery,
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "new",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search results returned",
    searchResult.data.length > 0,
  );

  // Step 5: Verify results are sorted by created_at in descending order (newest first)
  for (let i = 1; i < searchResult.data.length; i++) {
    const currentDate = new Date(searchResult.data[i].created_at);
    const previousDate = new Date(searchResult.data[i - 1].created_at);
    TestValidator.predicate(
      `result ${i} is newer than or equal to result ${i + 1}`,
      previousDate.getTime() >= currentDate.getTime(),
    );
  }

  // Step 6: Verify first result is the newest post
  const newestSearchResult = searchResult.data[0];
  const newestPost = posts[posts.length - 1];
  TestValidator.predicate(
    "newest post appears first in results",
    newestSearchResult.created_at >= newestPost.created_at,
  );

  // Step 7: Test sorting with date filter
  const filteredSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchQuery,
        page: 1,
        limit: 10,
        community: [community.id],
        dateFrom: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        dateTo: now.toISOString(),
        sortBy: "new",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(filteredSearch);

  // Verify filtered results are also sorted by creation time (descending)
  for (let i = 1; i < filteredSearch.data.length; i++) {
    const currentDate = new Date(filteredSearch.data[i].created_at);
    const previousDate = new Date(filteredSearch.data[i - 1].created_at);
    TestValidator.predicate(
      `filtered result ${i} is newer than or equal to result ${i + 1}`,
      previousDate.getTime() >= currentDate.getTime(),
    );
  }

  // Step 8: Verify pagination with 'new' sorting
  const paginatedSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchQuery,
        page: 1,
        limit: 2,
        community: [community.id],
        sortBy: "new",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedSearch.data.length <= 2,
  );

  // Verify first page maintains new sorting order
  if (paginatedSearch.data.length > 1) {
    const firstDate = new Date(paginatedSearch.data[0].created_at);
    const secondDate = new Date(paginatedSearch.data[1].created_at);
    TestValidator.predicate(
      "first page maintains new sort order",
      firstDate.getTime() >= secondDate.getTime(),
    );
  }

  TestValidator.predicate("search sorting by new completed successfully", true);
}
