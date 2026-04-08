import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_popular_feed_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community to host test posts
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description:
            "Test community for popular feed search and pagination testing",
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple test posts with various titles and content for search testing
  const searchTerms = [
    "tutorial",
    "guide",
    "how to",
    "best practices",
  ] as const;
  const posts: IRedditPlatformPost[] = [];
  for (let i = 0; i < 10; i++) {
    const searchTerm = searchTerms[i % searchTerms.length];
    const post = await api.functional.redditPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          title: `${searchTerm} post ${i + 1}: Advanced guide with ${searchTerm}izing techniques`,
          post_type: "text",
          text_content: `This is a detailed ${searchTerm} guide covering ${searchTerm}izing methods, ${searchTerm} approaches, and ${searchTerm} strategies. Learn how to ${searchTerm} effectively in real-world scenarios.`,
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Test empty search - should return all posts
  const emptySearchResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        search: "",
        limit: 100,
      },
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns all posts",
    emptySearchResult.data.length,
    posts.length,
  );
  // 5. Test search with partial match
  const partialSearchResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        search: "tutorial",
        limit: 100,
      },
    });
  typia.assert(partialSearchResult);
  TestValidator.equals(
    "tutorial search returns matching posts",
    partialSearchResult.data.length,
    posts.filter((p) => p.title.toLowerCase().includes("tutorial")).length,
  );
  // 6. Test limit parameter - default should be 20
  const defaultLimitResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {},
    });
  typia.assert(defaultLimitResult);
  TestValidator.equals(
    "default limit is 20",
    defaultLimitResult.pagination.limit,
    20,
  );
  // 7. Test limit exceeding maximum (should be capped at 100)
  const overLimitResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        limit: 200,
      },
    });
  typia.assert(overLimitResult);
  TestValidator.equals(
    "limit over 100 is capped at 100",
    overLimitResult.pagination.limit,
    100,
  );
  // 8. Test custom limit
  const customLimitResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        limit: 50,
      },
    });
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit of 50 is respected",
    customLimitResult.pagination.limit,
    50,
  );
  // 9. Test page parameter
  const page1Result =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(page1Result);
  TestValidator.equals("page 1 is valid", page1Result.pagination.current, 1);
  // 10. Test page 2
  const page2Result =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        page: 2,
        limit: 10,
      },
    });
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 has correct current page",
    page2Result.pagination.current,
    2,
  );
  // 11. Test invalid page (0) should default to page 1
  const invalidPageResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        page: 0,
        limit: 10,
      },
    });
  typia.assert(invalidPageResult);
  TestValidator.equals(
    "invalid page 0 defaults to page 1",
    invalidPageResult.pagination.current,
    1,
  );
  // 12. Test pagination metadata accuracy
  TestValidator.predicate("pagination has accurate total records", () => {
    const expectedPages = Math.ceil(
      posts.length / customLimitResult.pagination.limit,
    );
    return (
      customLimitResult.pagination.records === posts.length &&
      customLimitResult.pagination.pages === expectedPages
    );
  });
  // 13. Test search with omit parameter
  const omitSearchResult =
    await api.functional.redditPlatform.member.feeds.popular.index(connection, {
      body: {
        limit: 100,
      },
    });
  typia.assert(omitSearchResult);
  TestValidator.equals(
    "omitted search returns same as empty string",
    omitSearchResult.data.length,
    emptySearchResult.data.length,
  );
}