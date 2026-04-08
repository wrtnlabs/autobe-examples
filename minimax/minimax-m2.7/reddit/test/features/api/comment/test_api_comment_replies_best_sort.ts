import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_replies_best_sort(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving nested replies under a comment sorted by Best (highest vote score first).
  // Verify the response contains paginated reply summaries with author details, vote scores,
  // and timestamps. Validate that sorting places highest-voted replies at the top.
  // Check pagination metadata is correctly returned with current page, total records, and page count.
  // Create a mock comment ID for testing
  const parentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Call the replies endpoint with Best sort
  const response =
    await api.functional.redditClone.redditClone.comments.replies.index(
      connection,
      {
        commentId: parentCommentId,
        body: {
          sort: "Best",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate each reply has required fields
  for (const reply of response.data) {
    TestValidator.predicate(
      "reply has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(reply.id),
    );
    TestValidator.predicate("reply has content", reply.content.length > 0);
    TestValidator.predicate("reply has author", !!reply.author);
    TestValidator.predicate(
      "reply has author id",
      /^[0-9a-f-]{36}$/i.test(reply.author.id),
    );
    TestValidator.predicate(
      "reply has author username",
      reply.author.username.length > 0,
    );
    TestValidator.predicate(
      "reply has valid vote score",
      typeof reply.voteScore === "number",
    );
    TestValidator.predicate(
      "reply has valid timestamp",
      !isNaN(Date.parse(reply.createdAt)),
    );
    TestValidator.predicate(
      "reply has replies array",
      Array.isArray(reply.replies),
    );
  }
  // Validate replies are sorted by vote score (highest first) - Best sort
  const replyVoteScores = response.data.map((reply) => reply.voteScore);
  for (let i = 0; i < replyVoteScores.length - 1; i++) {
    TestValidator.predicate(
      `Reply at index ${i} has >= vote score than reply at index ${i + 1}`,
      replyVoteScores[i] >= replyVoteScores[i + 1],
    );
  }
  // Validate total records match data length
  if (response.pagination.records > 0) {
    TestValidator.equals(
      "data length matches pagination records when records > 0",
      response.data.length,
      response.pagination.records,
    );
  }
}
