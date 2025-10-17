import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_posts_search_by_topic(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member to create topic-specific posts
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password_hash: "hashed_password_123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create two distinct topics to test filtering
  const topic1: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation", // Valid predefined topic
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic1);

  const topic2: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Tax Policy", // Valid predefined topic
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic2);

  // Step 3: Create posts associated with different topics
  const postWithTopic1: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic1.id, // Associate with topic 1
        subject: "Impact of Consumer Spending on Inflation",
        content:
          "Recent data shows a strong correlation between consumer spending habits and inflation rates in the current fiscal year. This trend is particularly evident in essential goods categories such as food and housing.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(postWithTopic1);

  const postWithTopic2: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic2.id, // Associate with topic 2
        subject: "Progressive Taxation Debate",
        content:
          "The proposal for progressive taxation has generated significant discussion among economists. While it aims to reduce income inequality, critics argue it may negatively impact entrepreneurship and investment.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(postWithTopic2);

  const postWithoutTopic: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic1.id, // This will be re-creatable with different topic
        subject: "Non-Filtered Post",
        content:
          "This post is created but will be filtered out when searching by topic 2.",
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(postWithoutTopic);

  // Step 4: Search posts specifically by topic1 ID to verify filtering
  const searchResponse: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        topic: "Inflation", // Exactly match topic name as required in API
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(searchResponse);

  // Step 5: Validate search results contain only posts with the exact topic"Inflation"
  TestValidator.equals(
    "pagination matches expected values",
    searchResponse.pagination,
    {
      current: 1,
      limit: 10,
      records: 2, // Two posts in total are created, but only one matches the topic filter
      pages: 1,
    },
  );

  // Verify only posts with topic "Inflation" are present in the results
  TestValidator.equals(
    "search results contain exactly one post with topic Inflation",
    searchResponse.data.length,
    1,
  );

  // Verify the returned post has the correct topic
  TestValidator.equals(
    "returned post has correct topic ID",
    searchResponse.data[0].economic_board_topics_id,
    topic1.id,
  );

  // Verify the returned post has the correct subject
  TestValidator.equals(
    "returned post has correct subject",
    searchResponse.data[0].subject,
    "Impact of Consumer Spending on Inflation",
  );

  // Ensure no posts with other topic are present
  const postWithTopic2Exists = searchResponse.data.some(
    (post) => post.economic_board_topics_id === topic2.id,
  );
  TestValidator.predicate(
    "no posts with topic 'Tax Policy' are returned",
    !postWithTopic2Exists,
  );
}
