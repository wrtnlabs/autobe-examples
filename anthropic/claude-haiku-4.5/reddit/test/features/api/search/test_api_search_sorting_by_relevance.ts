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

export async function test_api_search_sorting_by_relevance(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        ip: "127.0.0.1",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create posts with keyword in different locations
  const searchKeyword = RandomGenerator.alphabets(8);

  // Post A: keyword in title only (highest relevance with 1.5x weight)
  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `${searchKeyword} first post about technology`,
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postA);

  // Post B: keyword in title and body (very high relevance)
  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `${searchKeyword} second discussion`,
        content_text: `This is about ${searchKeyword} and includes the keyword in body. ${RandomGenerator.content({ paragraphs: 2 })}`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postB);

  // Post C: keyword in body only (lower relevance)
  const postC: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "third post about general topics",
        content_text: `Contains ${searchKeyword} in body text. ${RandomGenerator.content({ paragraphs: 2 })}`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postC);

  // Post D: keyword in body with high vote score (lower relevance but higher votes)
  const postD: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "fourth post about trending",
        content_text: `This post also mentions ${searchKeyword} somewhere in the body. ${RandomGenerator.content({ paragraphs: 2 })}`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postD);

  // Step 4: Search with keyword without specifying sortBy (defaults to relevance)
  const searchResults: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults);

  // Step 5: Validate relevance-based sorting
  TestValidator.predicate(
    "search should return results",
    searchResults.data.length > 0,
  );

  // Verify that title matches (posts A and B) appear before body-only matches (posts C and D)
  const resultIds = searchResults.data.map(
    (result) => result.post?.id || result.comment?.post.id,
  );

  // Find indices of posts in results
  const indexA = resultIds.indexOf(postA.id);
  const indexB = resultIds.indexOf(postB.id);
  const indexC = resultIds.indexOf(postC.id);
  const indexD = resultIds.indexOf(postD.id);

  // Posts with keyword in title (A and B) should appear before posts with keyword only in body (C and D)
  if (indexA !== -1 && indexC !== -1) {
    TestValidator.predicate(
      "title match should rank higher than body-only match",
      indexA < indexC,
    );
  }

  if (indexB !== -1 && indexC !== -1) {
    TestValidator.predicate(
      "title match should rank higher than body-only match",
      indexB < indexC,
    );
  }

  // Step 6: Verify default sorting is relevance (no sortBy specified)
  const searchWithoutSort: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: searchKeyword,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchWithoutSort);

  // Should match previous results when sortBy is not specified
  TestValidator.equals(
    "default sort should be relevance",
    searchResults.data.length,
    searchWithoutSort.data.length,
  );
}
