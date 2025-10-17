import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_post_search_by_topic_filter(
  connection: api.IConnection,
) {
  // 1. Create a topic for filtering
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
        description: "Discussion about inflation rates and economic impact",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 2. Create multiple published posts with the topic
  const postCount = 5;
  const createdPosts: IEconomicBoardPost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post: IEconomicBoardPost =
      await api.functional.economicBoard.member.posts.create(connection, {
        body: {
          economic_board_topics_id: topic.id,
          subject: `Test post ${i + 1} about inflation`,
          content: `This is a test post about economic inflation. The topic is inflation.`,
        } satisfies IEconomicBoardPost.ICreate,
      });
    typia.assert(post);
    createdPosts.push(post);
  }

  // 3. Create a pending post (should be excluded from search results)
  const pendingPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Pending post about inflation",
        content:
          "This post should not appear in search results because status is pending",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(pendingPost);

  // 4. Create a rejected post (should be excluded from search results)
  const rejectedPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Rejected post about inflation",
        content:
          "This post should not appear in search results because status is rejected",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(rejectedPost);

  // 5. Create a post with different topic (should be excluded from search results)
  const differentTopic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Tax Policy",
        description: "Discussion about tax policy changes and impact",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(differentTopic);

  const differentTopicPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: differentTopic.id,
        subject: "Post about tax policy",
        content:
          "This post is about tax policy, not inflation, so should be excluded",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(differentTopicPost);

  // 6. Search for posts with topic filter "Inflation"
  const searchResults: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        topic: "Inflation",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(searchResults);

  // 7. Validate search results
  TestValidator.equals(
    "search results count matches expected",
    searchResults.data.length,
    postCount,
  );
  TestValidator.equals(
    "search results pagination matches",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "search results pagination limit matches",
    searchResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "search results pagination records match",
    searchResults.pagination.records,
    postCount,
  );
  TestValidator.equals(
    "search results pagination pages match",
    searchResults.pagination.pages,
    1,
  );

  // 8. Verify all returned posts have the correct topic and status
  for (const result of searchResults.data) {
    TestValidator.equals(
      "result topic id matches",
      result.economic_board_topics_id,
      topic.id,
    );
    TestValidator.equals(
      "result status is published",
      result.status,
      "published",
    );
    TestValidator.predicate(
      "result has subject",
      () => result.subject.length >= 5,
    );
    TestValidator.predicate(
      "result has content",
      () => result.content.length >= 10,
    );
  }

  // 9. Verify excluded posts are not in results
  // Check that the pending post is not in results
  const pendingPostInResults = searchResults.data.some(
    (p) => p.id === pendingPost.id,
  );
  TestValidator.equals(
    "pending post not in search results",
    pendingPostInResults,
    false,
  );

  // Check that the rejected post is not in results
  const rejectedPostInResults = searchResults.data.some(
    (p) => p.id === rejectedPost.id,
  );
  TestValidator.equals(
    "rejected post not in search results",
    rejectedPostInResults,
    false,
  );

  // Check that the different topic post is not in results
  const differentTopicPostInResults = searchResults.data.some(
    (p) => p.id === differentTopicPost.id,
  );
  TestValidator.equals(
    "different topic post not in search results",
    differentTopicPostInResults,
    false,
  );

  // 10. Test pagination with limit parameter
  const limitedResults: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        topic: "Inflation",
        page: 1,
        limit: 3,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(limitedResults);

  TestValidator.equals("limited results count", limitedResults.data.length, 3);
  TestValidator.equals(
    "limited pagination limit",
    limitedResults.pagination.limit,
    3,
  );
  TestValidator.equals(
    "limited pagination pages",
    limitedResults.pagination.pages,
    2,
  );
  TestValidator.equals(
    "limited pagination records",
    limitedResults.pagination.records,
    postCount,
  );

  // 11. Test with higher page number
  const secondPageResults: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        topic: "Inflation",
        page: 2,
        limit: 3,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(secondPageResults);

  TestValidator.equals("second page count", secondPageResults.data.length, 2);
  TestValidator.equals(
    "second page pagination limit",
    secondPageResults.pagination.limit,
    3,
  );
  TestValidator.equals(
    "second page pagination pages",
    secondPageResults.pagination.pages,
    2,
  );
  TestValidator.equals(
    "second page pagination records",
    secondPageResults.pagination.records,
    postCount,
  );
  TestValidator.equals(
    "second page pagination current",
    secondPageResults.pagination.current,
    2,
  );
}
