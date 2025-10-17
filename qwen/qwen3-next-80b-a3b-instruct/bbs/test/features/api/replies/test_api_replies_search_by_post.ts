import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReplies";
import type { IEconomicBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardReply";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardReplies";

export async function test_api_replies_search_by_post(
  connection: api.IConnection,
) {
  // Step 1: Create a valid topic for the post
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // Step 2: Create a published post to serve as parent for replies
  const post: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("post must be published", post.status, "published");

  // Step 3: Create multiple replies to the same post
  const replyCount = 5;
  const createdReplies: IEconomicBoardReply[] = await ArrayUtil.asyncRepeat(
    replyCount,
    async (index) => {
      const reply: IEconomicBoardReply =
        await api.functional.economicBoard.member.posts.replies.create(
          connection,
          {
            postId: post.id,
            body: {
              content: RandomGenerator.paragraph({
                sentences: 2,
                wordMin: 5,
                wordMax: 8,
              }),
            } satisfies IEconomicBoardReply.ICreate,
          },
        );
      typia.assert(reply);
      return reply;
    },
  );

  // Step 4: Verify replies are sorted by newest first (descending order by created_at)
  // Test with default pagination (page=1, limit=25)
  const repliesPage1: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {} satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(repliesPage1);

  TestValidator.equals(
    "default page count matches created replies",
    repliesPage1.data.length,
    replyCount,
  );
  TestValidator.equals(
    "default limit matches expectation",
    repliesPage1.pagination.limit,
    25,
  );
  TestValidator.equals(
    "default page number is 1",
    repliesPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records match",
    repliesPage1.pagination.records,
    replyCount,
  );
  TestValidator.equals(
    "total pages should be 1",
    repliesPage1.pagination.pages,
    1,
  );

  // Validate ordering: newest replies first (descending created_at)
  for (let i = 0; i < repliesPage1.data.length - 1; i++) {
    const currentReply = repliesPage1.data[i];
    const nextReply = repliesPage1.data[i + 1];
    TestValidator.predicate(
      "current reply should be newer than next",
      new Date(currentReply.created_at) > new Date(nextReply.created_at),
    );
  }

  // Step 5: Test pagination with limit=2
  const repliesPage2: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        limit: 2,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(repliesPage2);
  TestValidator.equals(
    "limit=2 should return 2 replies",
    repliesPage2.data.length,
    2,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    repliesPage2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current should be 1",
    repliesPage2.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records should be 5",
    repliesPage2.pagination.records,
    replyCount,
  );
  TestValidator.equals(
    "pagination pages should be 3 (ceil(5/2))",
    repliesPage2.pagination.pages,
    3,
  );

  // Validate first two replies are the two newest
  const firstReply = repliesPage2.data[0];
  const secondReply = repliesPage2.data[1];
  TestValidator.equals(
    "first returned reply should be newest",
    firstReply.id,
    createdReplies[createdReplies.length - 1].id,
  );
  TestValidator.equals(
    "second returned reply should be second newest",
    secondReply.id,
    createdReplies[createdReplies.length - 2].id,
  );

  // Step 6: Test page=2 with limit=2 (should return 2nd and 3rd newest)
  const repliesPage3: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(repliesPage3);
  TestValidator.equals(
    "page=2 with limit=2 should return 2 replies",
    repliesPage3.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current should be 2",
    repliesPage3.pagination.current,
    2,
  );

  // Confirm 1st returned on page 2 is the 3rd newest overall
  TestValidator.equals(
    "first reply on page 2 should be 3rd newest",
    repliesPage3.data[0].id,
    createdReplies[createdReplies.length - 3].id,
  );
  TestValidator.equals(
    "second reply on page 2 should be 4th newest",
    repliesPage3.data[1].id,
    createdReplies[createdReplies.length - 4].id,
  );

  // Step 7: Test search functionality - search for a keyword in replies
  const searchTerm = "test";
  const repliesWithSearch: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {
        search: searchTerm,
      } satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(repliesWithSearch);

  // Verify search works and returns matching replies
  for (const reply of repliesWithSearch.data) {
    TestValidator.predicate(
      "reply content contains search term",
      reply.content.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Step 8: Test that replies to other posts are excluded
  // Create another post with replies
  const otherPost: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(otherPost);

  const otherReply: IEconomicBoardReply =
    await api.functional.economicBoard.member.posts.replies.create(connection, {
      postId: otherPost.id,
      body: {
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
      } satisfies IEconomicBoardReply.ICreate,
    });
  typia.assert(otherReply);

  // Verify that otherReply is NOT in our post's search results
  const repliesPage4: IPageIEconomicBoardReplies =
    await api.functional.economicBoard.posts.replies.index(connection, {
      postId: post.id,
      body: {} satisfies IEconomicBoardReplies.IRequest,
    });
  typia.assert(repliesPage4);

  TestValidator.predicate(
    "other reply not in search results",
    !repliesPage4.data.some((reply) => reply.id === otherReply.id),
  );
}
