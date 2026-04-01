import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_popular_feed_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community to host test posts
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create 60 posts with different types (text, link, image)
  const textPosts: IRedditCommunityPost[] = [];
  const linkPosts: IRedditCommunityPost[] = [];
  const imagePosts: IRedditCommunityPost[] = [];
  // Create 20 text posts
  for (let i = 0; i < 20; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "text",
          text_content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
    typia.assert(post);
    textPosts.push(post);
  }
  // Create 20 link posts
  for (let i = 0; i < 20; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "link",
          link_url: `https://example${i}.com/article/${RandomGenerator.alphabets(5)}`,
        },
      },
    );
    typia.assert(post);
    linkPosts.push(post);
  }
  // Create 20 image posts
  for (let i = 0; i < 20; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "image",
          image_path: `/images/post_${RandomGenerator.alphabets(8)}.jpg`,
        },
      },
    );
    typia.assert(post);
    imagePosts.push(post);
  }
  const totalPosts = textPosts.length + linkPosts.length + imagePosts.length;
  // 4. Default Pagination Test (limit=20, page=1)
  const defaultFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
        },
      },
    );
  typia.assert(defaultFeed);
  TestValidator.predicate(
    "default limit is 20 or less",
    () => defaultFeed.data.length <= 20,
  );
  TestValidator.equals("default page is 1", defaultFeed.pagination.current, 1);
  TestValidator.equals("default limit is 20", defaultFeed.pagination.limit, 20);
  TestValidator.predicate(
    "total records matches created posts",
    () => defaultFeed.pagination.records >= totalPosts,
  );
  // 5. Custom Page Size Tests
  const limit10Feed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          limit: 10,
        },
      },
    );
  typia.assert(limit10Feed);
  TestValidator.predicate(
    "limit 10 returns 10 or less",
    () => limit10Feed.data.length <= 10,
  );
  TestValidator.equals("limit reflects 10", limit10Feed.pagination.limit, 10);
  const limit50Feed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          limit: 50,
        },
      },
    );
  typia.assert(limit50Feed);
  TestValidator.predicate(
    "limit 50 returns 50 or less",
    () => limit50Feed.data.length <= 50,
  );
  TestValidator.equals("limit reflects 50", limit50Feed.pagination.limit, 50);
  const limit100Feed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          limit: 100,
        },
      },
    );
  typia.assert(limit100Feed);
  TestValidator.predicate(
    "limit 100 returns 100 or less",
    () => limit100Feed.data.length <= 100,
  );
  TestValidator.equals(
    "limit reflects 100",
    limit100Feed.pagination.limit,
    100,
  );
  // 6. Page Navigation Tests
  const page1Feed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(page1Feed);
  TestValidator.equals("page 1 current", page1Feed.pagination.current, 1);
  const page2Feed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(page2Feed);
  TestValidator.equals("page 2 current", page2Feed.pagination.current, 2);
  // Verify page 1 and page 2 have different posts
  if (page1Feed.data.length > 0 && page2Feed.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and 2 have different posts",
      page1Feed.data[0].id,
      page2Feed.data[0].id,
    );
  }
  // Verify pagination.pages calculation
  const expectedPages = Math.ceil(
    page1Feed.pagination.records / page1Feed.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    page1Feed.pagination.pages,
    expectedPages,
  );
  // Test page beyond total pages
  const beyondPageFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          page: 9999,
          limit: 10,
        },
      },
    );
  typia.assert(beyondPageFeed);
  TestValidator.predicate(
    "beyond page returns empty or last page",
    () =>
      beyondPageFeed.data.length === 0 ||
      beyondPageFeed.pagination.current <= beyondPageFeed.pagination.pages,
  );
  // 7. Content Type Filtering - Text Posts
  const textOnlyFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          postType: "text",
          limit: 50,
        },
      },
    );
  typia.assert(textOnlyFeed);
  for (const post of textOnlyFeed.data) {
    TestValidator.equals("text post type", post.post_type, "text");
    TestValidator.predicate(
      "text_preview populated",
      () => post.text_preview !== null,
    );
    TestValidator.equals("link_domain null for text", post.link_domain, null);
    TestValidator.equals(
      "image_thumbnail null for text",
      post.image_thumbnail,
      null,
    );
  }
  // 8. Content Type Filtering - Link Posts
  const linkOnlyFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          postType: "link",
          limit: 50,
        },
      },
    );
  typia.assert(linkOnlyFeed);
  for (const post of linkOnlyFeed.data) {
    TestValidator.equals("link post type", post.post_type, "link");
    TestValidator.predicate(
      "link_domain populated",
      () => post.link_domain !== null,
    );
    TestValidator.equals("text_preview null for link", post.text_preview, null);
    TestValidator.equals(
      "image_thumbnail null for link",
      post.image_thumbnail,
      null,
    );
  }
  // 9. Content Type Filtering - Image Posts
  const imageOnlyFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          postType: "image",
          limit: 50,
        },
      },
    );
  typia.assert(imageOnlyFeed);
  for (const post of imageOnlyFeed.data) {
    TestValidator.equals("image post type", post.post_type, "image");
    TestValidator.predicate(
      "image_thumbnail populated",
      () => post.image_thumbnail !== null,
    );
    TestValidator.equals(
      "text_preview null for image",
      post.text_preview,
      null,
    );
    TestValidator.equals("link_domain null for image", post.link_domain, null);
  }
  // 10. Score Threshold Filtering (minScore)
  const minScoreFeed =
    await api.functional.redditCommunity.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          feedType: "popular",
          sort: "new",
          minScore: 0,
          limit: 50,
        },
      },
    );
  typia.assert(minScoreFeed);
  for (const post of minScoreFeed.data) {
    TestValidator.predicate("vote_score >= 0", () => post.vote_score >= 0);
  }
}
