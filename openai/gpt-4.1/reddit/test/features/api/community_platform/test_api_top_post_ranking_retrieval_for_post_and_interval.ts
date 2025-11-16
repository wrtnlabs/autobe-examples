import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTopPostRanking";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test retrieval of a specific post's top ranking data for a selected time
 * interval.
 *
 * This test validates both success and error scenarios:
 *
 * 1. For valid postId and interval, should return ranking record with correct
 *    structure.
 * 2. For non-existent postId or invalid interval, should return error.
 *
 * It checks correctness of returned fields, public access, and minimal error
 * handling.
 */
export async function test_api_top_post_ranking_retrieval_for_post_and_interval(
  connection: api.IConnection,
) {
  // 1. Prepare valid inputs
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validIntervals = ["day", "week", "month", "all-time"] as const;
  const interval: string = RandomGenerator.pick(validIntervals);

  // 2. Success case: valid postId and interval
  const output: ICommunityPlatformTopPostRanking =
    await api.functional.communityPlatform.topPostRankings.at(connection, {
      postId,
      interval,
    });
  typia.assert(output);

  // 3. Validate returned fields
  TestValidator.equals(
    "returned post_id matches request",
    output.post_id,
    postId,
  );
  TestValidator.equals(
    "returned interval matches request",
    output.interval,
    interval,
  );
  TestValidator.predicate(
    "rank is positive integer",
    typeof output.rank === "number" &&
      Number.isInteger(output.rank) &&
      output.rank >= 1,
  );
  TestValidator.predicate(
    "score is integer",
    typeof output.score === "number" && Number.isInteger(output.score),
  );
  TestValidator.predicate(
    "algorithm_version is non-empty string",
    typeof output.algorithm_version === "string" &&
      output.algorithm_version.length > 0,
  );
  TestValidator.predicate(
    "computed_at is ISO 8601 format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d+Z$/.test(
      output.computed_at,
    ),
  );
  TestValidator.predicate(
    "post summary included",
    output.post !== undefined && typeof output.post.id === "string",
  );

  // 4. Public API: No authentication (implicit in this setup)

  // 5a. Failure case: non-existent postId
  await TestValidator.error("error for non-existent postId", async () => {
    await api.functional.communityPlatform.topPostRankings.at(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      interval,
    });
  });

  // 5b. Failure case: invalid interval
  await TestValidator.error("error for invalid interval", async () => {
    await api.functional.communityPlatform.topPostRankings.at(connection, {
      postId,
      interval: "invalid-interval",
    });
  });

  // 5c. Failure case: non-existent postId AND invalid interval
  await TestValidator.error(
    "error for both non-existent postId and invalid interval",
    async () => {
      await api.functional.communityPlatform.topPostRankings.at(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        interval: "not-an-interval",
      });
    },
  );
}
