import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_community_feed_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Setup: Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Setup: Create posts with distinct searchable content
  const uniqueKeyword = `unique_${RandomGenerator.alphabets(8)}`;
  const textContentKeyword = `content_${RandomGenerator.alphabets(8)}`;
  // TEXT post with searchable title and content
  const textPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: `${uniqueKeyword}_TEXT_TITLE`,
          post_type: "TEXT",
          text_content: `${textContentKeyword} searchable text content for testing purposes`,
        },
      },
    );
  typia.assert(textPost);
  // LINK post with searchable title
  const linkPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: `${uniqueKeyword}_LINK_TITLE`,
          post_type: "LINK",
          link_url: "https://example.com/article/test",
        },
      },
    );
  typia.assert(linkPost);
  // IMAGE post with searchable title
  const imagePost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: `${uniqueKeyword}_IMAGE_TITLE`,
          post_type: "IMAGE",
          image_url: "https://example.com/images/test.jpg",
        },
      },
    );
  typia.assert(imagePost);
  // Test 1: Search by title keyword - case-insensitive partial match
  const titleSearchResult =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityName: community.name,
      body: {
        search: uniqueKeyword.toLowerCase(),
      } satisfies ICommunityPost.IRequest,
    });
  typia.assert(titleSearchResult);
  TestValidator.predicate(
    "title search finds all matching posts",
    titleSearchResult.data.length === 3,
  );
  TestValidator.predicate(
    "title search includes TEXT post",
    titleSearchResult.data.some((p) => p.id === textPost.id),
  );
  TestValidator.predicate(
    "title search includes LINK post",
    titleSearchResult.data.some((p) => p.id === linkPost.id),
  );
  TestValidator.predicate(
    "title search includes IMAGE post",
    titleSearchResult.data.some((p) => p.id === imagePost.id),
  );
  // Test 2: Search by content keyword - matches text_content
  const contentSearchResult =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityName: community.name,
      body: { search: textContentKeyword } satisfies ICommunityPost.IRequest,
    });
  typia.assert(contentSearchResult);
  TestValidator.equals(
    "content search finds TEXT post",
    contentSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "content search result is TEXT post",
    contentSearchResult.data[0].id,
    textPost.id,
  );
  // Test 3: Filter by postType TEXT
  const textFilterResult =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityName: community.name,
      body: { postType: "TEXT" } satisfies ICommunityPost.IRequest,
    });
  typia.assert(textFilterResult);
  TestValidator.predicate(
    "TEXT filter returns TEXT posts only",
    textFilterResult.data.every((p) => p.post_type === "TEXT"),
  );
  const textPostSummary = textFilterResult.data.find(
    (p) => p.id === textPost.id,
  );
  TestValidator.predicate(
    "TEXT post has text_preview",
    textPostSummary !== undefined && textPostSummary.text_preview !== null,
  );
  TestValidator.equals(
    "TEXT post link_domain is null",
    textPostSummary?.link_domain,
    null,
  );
  TestValidator.equals(
    "TEXT post image_thumbnail_url is null",
    textPostSummary?.image_thumbnail_url,
    null,
  );
  // Test 4: Filter by postType LINK
  const linkFilterResult =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityName: community.name,
      body: { postType: "LINK" } satisfies ICommunityPost.IRequest,
    });
  typia.assert(linkFilterResult);
  TestValidator.predicate(
    "LINK filter returns LINK posts only",
    linkFilterResult.data.every((p) => p.post_type === "LINK"),
  );
  const linkPostSummary = linkFilterResult.data.find(
    (p) => p.id === linkPost.id,
  );
  TestValidator.equals(
    "LINK post text_preview is null",
    linkPostSummary?.text_preview,
    null,
  );
  TestValidator.predicate(
    "LINK post has link_domain",
    linkPostSummary !== undefined && linkPostSummary.link_domain !== null,
  );
  TestValidator.equals(
    "LINK post image_thumbnail_url is null",
    linkPostSummary?.image_thumbnail_url,
    null,
  );
  // Test 5: Filter by postType IMAGE
  const imageFilterResult =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityName: community.name,
      body: { postType: "IMAGE" } satisfies ICommunityPost.IRequest,
    });
  typia.assert(imageFilterResult);
  TestValidator.predicate(
    "IMAGE filter returns IMAGE posts only",
    imageFilterResult.data.every((p) => p.post_type === "IMAGE"),
  );
  const imagePostSummary = imageFilterResult.data.find(
    (p) => p.id === imagePost.id,
  );
  TestValidator.equals(
    "IMAGE post text_preview is null",
    imagePostSummary?.text_preview,
    null,
  );
  TestValidator.equals(
    "IMAGE post link_domain is null",
    imagePostSummary?.link_domain,
    null,
  );
  TestValidator.predicate(
    "IMAGE post has image_thumbnail_url",
    imagePostSummary !== undefined &&
      imagePostSummary.image_thumbnail_url !== null,
  );
  // Test 6: Combined search + postType filter
  const combinedResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        search: uniqueKeyword,
        postType: "LINK",
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter returns only matching LINK post",
    combinedResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter result is the LINK post",
    combinedResult.data[0].id,
    linkPost.id,
  );
  TestValidator.equals(
    "combined filter post type is LINK",
    combinedResult.data[0].post_type,
    "LINK",
  );
  // Test 7: Edge case - search with no matches
  const noMatchResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        search: `nonexistent_${RandomGenerator.alphabets(10)}`,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "search with no matches returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search with no matches has correct pagination",
    noMatchResult.pagination.records,
    0,
  );
  // Test 8: Edge case - empty search returns all posts
  const emptySearchResult =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityName: community.name,
      body: { search: "" } satisfies ICommunityPost.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns all posts",
    emptySearchResult.data.length >= 3,
  );
}
