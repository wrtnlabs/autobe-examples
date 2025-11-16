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

export async function test_api_search_community_filter(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create first community
  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  // Step 3: Create second community
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Gaming Community",
          identifier: `gaming_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for gaming discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "entertainment",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // Step 4: Create post in first community with search keyword
  const searchKeyword = "programming";
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        post_type: "text",
        title: `Discussion about ${searchKeyword}`,
        content_text: `Let's talk about ${searchKeyword} best practices and latest trends`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  // Step 5: Create post in second community with same search keyword
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community2.id,
        post_type: "text",
        title: `${searchKeyword} games and development`,
        content_text: `Exploring ${searchKeyword} in the gaming industry`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Step 6: Search with single community filter
  const singleCommunitySearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 50,
        community: [community1.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(singleCommunitySearch);

  // Validate single community filter results
  TestValidator.predicate(
    "single community search results should only contain posts from filtered community",
    singleCommunitySearch.data.every(
      (result) => result.community.id === community1.id,
    ),
  );

  const post1Found = singleCommunitySearch.data.some(
    (result) => result.post?.id === post1.id,
  );
  TestValidator.predicate(
    "post from filtered community should be in results",
    post1Found,
  );

  const post2NotFound = !singleCommunitySearch.data.some(
    (result) => result.post?.id === post2.id,
  );
  TestValidator.predicate(
    "post from non-filtered community should not be in results",
    post2NotFound,
  );

  // Step 7: Search with multiple community filters
  const multiCommunitySearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 50,
        community: [community1.id, community2.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(multiCommunitySearch);

  // Validate multiple community filter results
  TestValidator.predicate(
    "multi-community search should only contain posts from filtered communities",
    multiCommunitySearch.data.every(
      (result) =>
        result.community.id === community1.id ||
        result.community.id === community2.id,
    ),
  );

  const post1InMulti = multiCommunitySearch.data.some(
    (result) => result.post?.id === post1.id,
  );
  TestValidator.predicate(
    "post from first filtered community should be in multi-community results",
    post1InMulti,
  );

  const post2InMulti = multiCommunitySearch.data.some(
    (result) => result.post?.id === post2.id,
  );
  TestValidator.predicate(
    "post from second filtered community should be in multi-community results",
    post2InMulti,
  );

  // Step 8: Test AND logic between community filter and keyword search
  const uniqueKeyword = `unique_${RandomGenerator.alphaNumeric(8)}`;
  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        post_type: "text",
        title: `Only in tech: ${uniqueKeyword}`,
        content_text: `This post contains ${uniqueKeyword} and is specific to technology`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  // Search with specific keyword in specific community
  const andLogicSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: uniqueKeyword,
        page: 1,
        limit: 50,
        community: [community2.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(andLogicSearch);

  // Validate AND logic: community2 filter AND uniqueKeyword search
  const shouldBeEmpty = andLogicSearch.data.length === 0;
  TestValidator.predicate(
    "AND logic: filtering by community2 with keyword from community1 should return no results",
    shouldBeEmpty,
  );

  // Search same keyword in correct community
  const correctAndLogicSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: uniqueKeyword,
        page: 1,
        limit: 50,
        community: [community1.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(correctAndLogicSearch);

  const post3Found = correctAndLogicSearch.data.some(
    (result) => result.post?.id === post3.id,
  );
  TestValidator.predicate(
    "AND logic: filtering by community1 with keyword from community1 should return the post",
    post3Found,
  );
}
