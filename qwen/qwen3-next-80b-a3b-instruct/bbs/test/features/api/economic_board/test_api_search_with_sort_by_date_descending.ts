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

export async function test_api_search_with_sort_by_date_descending(
  connection: api.IConnection,
) {
  // 1. Authenticate member to create posts
  const email = typia.random<string & tags.Format<"email">>();
  const member: IEconomicBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password_hash: "hashedpassword123",
      } satisfies IEconomicBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a topic for categorization
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Monetary Policy",
        description:
          "Discussion on central banking, interest rates, and financial systems",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Create multiple posts with sequential timestamps
  // The posts will be created one after another, creating a chronological sequence
  // We will create at least 5 posts to verify sorting works correctly
  const postCreationPromises = ArrayUtil.repeat(5, async (index) => {
    // Inject a delay between 0 and 1000ms to ensure distinct creation timestamps
    await new Promise((resolve) => setTimeout(resolve, index * 100));

    const post: IEconomicBoardPost =
      await api.functional.economicBoard.member.posts.create(connection, {
        body: {
          economic_board_topics_id: topic.id,
          subject: `Post on Monetary Policy ${index + 1}`,
          content: `This is a detailed discussion about monetary policy trends ${index + 1}. The central bank is considering interest rate adjustments in response to inflationary pressures.`,
        } satisfies IEconomicBoardPost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  const createdPosts: IEconomicBoardPost[] =
    await Promise.all(postCreationPromises);

  // 4. Verify all posts were created successfully and have timestamps
  TestValidator.equals("created 5 posts", createdPosts.length, 5);
  createdPosts.forEach((post) => {
    TestValidator.predicate(
      "post has created_at timestamp",
      post.created_at !== undefined,
    );
    TestValidator.predicate(
      "post has valid date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(post.created_at),
    );
  });

  // 5. Execute search with descending date sort
  // Request posts sorted by created_at in descending order (newest first)
  const searchResult: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        sortBy: "created_at",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(searchResult);

  // 6. Validate search response structure
  TestValidator.equals(
    "search returned correct page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search returned correct limit",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "search returned correct number of items",
    searchResult.data.length,
    5,
  );

  // 7. Validate chronological descending order (newest first)
  // The first post in response should be the most recently created
  // The last post in response should be the oldest created
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    const currentPost = searchResult.data[i];
    const nextPost = searchResult.data[i + 1];

    // Verify current post is newer than or equal to next post
    const currentTimestamp = new Date(currentPost.created_at).getTime();
    const nextTimestamp = new Date(nextPost.created_at).getTime();

    TestValidator.predicate(
      `post ${i + 1} is newer than or equal to post ${i + 2}`,
      currentTimestamp >= nextTimestamp,
    );

    // Ensure we're not getting identical timestamps (our delays should prevent this)
    TestValidator.predicate(
      `post ${i + 1} is not identical to post ${i + 2} in time`,
      currentTimestamp > nextTimestamp,
    );
  }

  // 8. Verify the order matches our creation order - our createdPosts were
  // created in order index 0 to 4, so they should appear reversed in search results
  for (let i = 0; i < createdPosts.length; i++) {
    const createdPost = createdPosts[i];
    const expectedPostInResponse =
      searchResult.data[createdPosts.length - 1 - i];

    TestValidator.equals(
      `post creation order verification: post ${i + 1}`,
      createdPost.id,
      expectedPostInResponse.id,
    );
  }
}
