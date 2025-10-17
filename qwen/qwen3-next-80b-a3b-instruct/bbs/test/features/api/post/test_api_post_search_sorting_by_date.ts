import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_post_search_sorting_by_date(
  connection: api.IConnection,
) {
  // Step 1: Create a topic for all posts
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 2: Create 3 posts with the same topic
  const post1 = await api.functional.economicBoard.member.posts.create(
    connection,
    {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Post about current inflation trends",
        content:
          "The latest data shows inflation has slightly decreased this month, but long-term trends remain concerning.",
      } satisfies IEconomicBoardPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.economicBoard.member.posts.create(
    connection,
    {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Monetary policy responses to inflation",
        content:
          "Central banks are adjusting interest rates to combat inflation, but there's debate on the appropriate pace.",
      } satisfies IEconomicBoardPost.ICreate,
    },
  );
  typia.assert(post2);

  const post3 = await api.functional.economicBoard.member.posts.create(
    connection,
    {
      body: {
        economic_board_topics_id: topic.id,
        subject: "Global trade impacts on inflation",
        content:
          "Supply chain disruptions continue to affect prices, with import costs playing a significant role in inflation metrics.",
      } satisfies IEconomicBoardPost.ICreate,
    },
  );
  typia.assert(post3);

  // Step 3: Search for posts without specifying sort parameter
  // The default behavior should be sorting by created_at descending (newest first)
  const searchResult: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        topic: "Inflation",
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate sorting order (newest first)
  // The post created last should be first in the results
  // The post created earliest should be last
  TestValidator.equals(
    "search result has 3 posts",
    searchResult.data.length,
    3,
  );

  // The first post should be the newest (post1)
  TestValidator.equals(
    "first post is newest",
    searchResult.data[0].id,
    post1.id,
  );

  // The second post should be the middle post (post2)
  TestValidator.equals(
    "second post is middle",
    searchResult.data[1].id,
    post2.id,
  );

  // The last post should be the oldest (post3)
  TestValidator.equals(
    "last post is oldest",
    searchResult.data[2].id,
    post3.id,
  );

  // Step 5: Validate timestamps are correctly ordered in descending order
  TestValidator.predicate(
    "posts sorted by descending created_at",
    new Date(searchResult.data[0].created_at) >
      new Date(searchResult.data[1].created_at) &&
      new Date(searchResult.data[1].created_at) >
        new Date(searchResult.data[2].created_at),
  );
}
