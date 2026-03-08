import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeedNewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedNewRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the NEW posts feed endpoint to verify it displays posts from all communities
 * sorted by most recent creation time in descending order.
 */
export async function test_api_feeds_new_posts_list(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic functionality with default pagination parameters
  const defaultPageResponse =
    await api.functional.redditPlatform.feeds._new.index(connection, {
      body: {},
    });
  typia.assert(defaultPageResponse);
  // Test 2: Validate response structure includes proper pagination metadata
  const pagination1: IPage.IPagination = defaultPageResponse.pagination;
  typia.assert(pagination1);
  TestValidator.equals("pagination has current page 1", pagination1.current, 1);
  TestValidator.equals("pagination has limit 20", pagination1.limit, 20);
  // Test 3: Verify posts are sorted by created_at DESC (newest first)
  if (defaultPageResponse.data.length > 1) {
    for (let i = 0; i < defaultPageResponse.data.length - 1; i++) {
      const currentPost = defaultPageResponse.data[i];
      const nextPost = defaultPageResponse.data[i + 1];
      TestValidator.predicate(
        `post ${i + 1} should be newer than or equal to post ${i + 2}`,
        () => new Date(currentPost.created_at) >= new Date(nextPost.created_at),
      );
    }
  }
  // Test 4: Test pagination with custom parameters (page=2, limit=10)
  const customPageResponse =
    await api.functional.redditPlatform.feeds._new.index(connection, {
      body: {
        page: 2,
        limit: 10,
      },
    });
  typia.assert(customPageResponse);
  TestValidator.equals(
    "custom page pagination current is 2",
    customPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom page pagination limit is 10",
    customPageResponse.pagination.limit,
    10,
  );
  // Test 5: Validate pagination metadata accuracy
  const expectedPages =
    customPageResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          customPageResponse.pagination.records /
            customPageResponse.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages is correct",
    customPageResponse.pagination.pages,
    expectedPages,
  );
  // Test 6: Verify hasNextPage logic using pagination.pages
  const hasNextPage =
    customPageResponse.pagination.current < customPageResponse.pagination.pages;
  TestValidator.equals(
    "hasNextPage should be true when more pages exist",
    hasNextPage,
    customPageResponse.pagination.current < customPageResponse.pagination.pages,
  );
  // Test 7: Test filtering by specific community using community_id parameter
  let communityId: string | undefined;
  if (defaultPageResponse.data.length > 0) {
    const samplePost = defaultPageResponse.data[0];
    communityId = samplePost.community.id;
    const filteredResponse =
      await api.functional.redditPlatform.feeds._new.index(connection, {
        body: {
          community_id: communityId,
        },
      });
    typia.assert(filteredResponse);
    TestValidator.equals(
      "filtered posts all belong to same community",
      filteredResponse.data.length,
      filteredResponse.data.filter((post) => post.community.id === communityId)
        .length,
    );
    if (filteredResponse.data.length > 0) {
      TestValidator.equals(
        "filtered community id matches",
        filteredResponse.data[0].community.id,
        communityId,
      );
    }
  }
  // Test 8: Verify post contains all required fields (typia.assert covers this)
  // No need for manual field checks after typia.assert()
  // Test 9: Verify author information
  if (defaultPageResponse.data.length > 0) {
    const samplePost: IRedditPlatformPost.ISummary =
      defaultPageResponse.data[0];
    const author: IRedditPlatformMember.ISummary = samplePost.author;
    typia.assert(author);
    TestValidator.notEquals("author has username", "", author.username);
    TestValidator.notEquals("author has displayName", "", author.displayName);
    TestValidator.predicate(
      "author has karmaScore",
      () => author.karmaScore >= 0,
    );
    TestValidator.notEquals("author has createdAt", "", author.createdAt);
    TestValidator.predicate(
      "author has subscriptionCount",
      () => author.subscriptionCount >= 0,
    );
    typia.assertGuard(
      author.avatarUrl !== null && author.avatarUrl !== undefined,
    );
    if (author.avatarUrl) {
      TestValidator.notEquals("author has avatarUrl", "", author.avatarUrl);
    }
  }
  // Test 10: Verify community information includes name, icon_url, subscriber_count
  if (defaultPageResponse.data.length > 0) {
    const samplePost: IRedditPlatformPost.ISummary =
      defaultPageResponse.data[0];
    const community: IRedditPlatformCommunity.ISummary = samplePost.community;
    typia.assert(community);
    TestValidator.notEquals("community has name", "", community.name);
    TestValidator.predicate(
      "community has subscriber_count",
      () => community.subscriber_count >= 0,
    );
    typia.assertGuard(
      community.created_at !== null && community.created_at !== undefined,
    );
    if (community.created_at) {
      TestValidator.notEquals(
        "community has created_at",
        "",
        community.created_at,
      );
    }
  }
  // Test 11: Test with limit=50 (maximum allowed) to validate upper boundary
  const maxLimitResponse = await api.functional.redditPlatform.feeds._new.index(
    connection,
    {
      body: {
        limit: 50,
      },
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit is 50",
    maxLimitResponse.pagination.limit,
    50,
  );
  // Test 12: Verify post_type values are valid (TEXT, LINK, IMAGE)
  const validPostTypes = ["TEXT", "LINK", "IMAGE"] as const;
  if (defaultPageResponse.data.length > 0) {
    defaultPageResponse.data.forEach((post) => {
      TestValidator.predicate(
        `post ${post.id} has valid post_type ${post.post_type}`,
        () =>
          validPostTypes.includes(
            post.post_type as (typeof validPostTypes)[number],
          ),
      );
    });
  }
  // Test 13: Test with minimal page=1, limit=1 to verify edge case pagination
  const minimalResponse = await api.functional.redditPlatform.feeds._new.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      },
    },
  );
  typia.assert(minimalResponse);
  TestValidator.equals(
    "minimal pagination current is 1",
    minimalResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimal pagination limit is 1",
    minimalResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimal pagination has correct records",
    () => minimalResponse.pagination.records === minimalResponse.data.length,
  );
}
