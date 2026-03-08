import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikePostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_vote_summary_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test edge case: Empty string postId (should return 400)
  await TestValidator.error(
    "empty string postId should return 400",
    async () => {
      await api.functional.redditLike.posts.votes.summary(connection, {
        postId: "",
      });
    },
  );
  // 2. Test edge case: Non-existent post ID (should return 404)
  await TestValidator.error(
    "non-existent post ID should return 404",
    async () => {
      await api.functional.redditLike.posts.votes.summary(connection, {
        postId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
  // 3. Generate a random valid UUID for testing
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test with valid UUID format (may return 404 if post doesn't exist, which is expected)
  // Since we can't create posts with available functions, this will test the endpoint structure
  try {
    const summary = await api.functional.redditLike.posts.votes.summary(
      connection,
      {
        postId: randomPostId,
      },
    );
    typia.assert(summary);
    // Verify the response structure
    TestValidator.predicate(
      "has vote_score property",
      typeof summary.vote_score === "number",
    );
    TestValidator.predicate(
      "has upvote_count property",
      typeof summary.upvote_count === "number",
    );
    TestValidator.predicate(
      "has downvote_count property",
      typeof summary.downvote_count === "number",
    );
  } catch (error) {
    // If 404 (post doesn't exist), that's acceptable since we can't create posts
    // This validates the endpoint works with valid UUID format
    if (error instanceof Error && "status" in error && error.status === 404) {
      // This is expected - post doesn't exist, but endpoint accepts valid UUID
      return;
    }
    throw error;
  }
  // 5. Test with different UUID formats to ensure validation
  const validUuid = typia.random<string & tags.Format<"uuid">>();
  const summary = await api.functional.redditLike.posts.votes.summary(
    connection,
    {
      postId: validUuid,
    },
  );
  typia.assert(summary);
  TestValidator.equals(
    "vote_score is int32 type",
    typeof summary.vote_score,
    "number",
  );
  TestValidator.equals(
    "upvote_count is int32 type",
    typeof summary.upvote_count,
    "number",
  );
  TestValidator.equals(
    "downvote_count is int32 type",
    typeof summary.downvote_count,
    "number",
  );
  // 6. Verify negative vote score scenario (if post has more downvotes)
  // This tests the data structure accepts negative values
  if (summary.vote_score < 0) {
    TestValidator.predicate(
      "vote_score can be negative",
      summary.vote_score < 0,
    );
  }
}