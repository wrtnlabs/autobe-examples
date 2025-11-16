import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformControversialPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialPostRanking";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that the controversial post ranking for a specific post and interval
 * can be retrieved publicly without authentication.
 *
 * This test exercises the public GET
 * /communityPlatform/controversialPostRankings/{postId}/{interval} endpoint.
 * The function sends requests with a mix of valid and intentionally invalid
 * postId/interval combinations, confirming that valid cases produce a ranking
 * conforming to ICommunityPlatformControversialPostRanking (as asserted by
 * typia.assert), and invalid combinations (such as random UUIDs or unsupported
 * intervals) result in an error as expected.
 *
 * Steps:
 *
 * 1. Create a valid test input of postId and interval using typia.random.
 * 2. Retrieve the ranking using the valid parameters and verify the full structure
 *    and all expected fields are present (using typia.assert), including
 *    correct shape of the post summary object.
 * 3. Attempt to retrieve a ranking with a random UUID and a valid-looking
 *    interval, and verify that an error is triggered (TestValidator.error),
 *    confirming proper business response to not-found case.
 * 4. Attempt to retrieve a ranking with a valid postId but a nonsense interval
 *    (e.g., 'nonsense_interval'), expecting an error to be triggered.
 * 5. Test that all successful and error cases work correctly for
 *    public/unauthenticated connection (no authentication performed or
 *    required).
 */
export async function test_api_controversial_post_ranking_retrieve_public_access(
  connection: api.IConnection,
) {
  // 1. Generate a valid postId and interval using typia.random() to simulate probable-realistic test values
  const sample: ICommunityPlatformControversialPostRanking =
    typia.random<ICommunityPlatformControversialPostRanking>();

  // 2. Retrieve ranking for a valid postId and interval
  const ranking: ICommunityPlatformControversialPostRanking =
    await api.functional.communityPlatform.controversialPostRankings.at(
      connection,
      {
        postId: sample.post_id,
        interval: sample.interval,
      },
    );
  typia.assert(ranking);
  TestValidator.equals(
    "correct post id in ranking",
    ranking.post_id,
    sample.post_id,
  );
  TestValidator.equals(
    "correct interval in ranking",
    ranking.interval,
    sample.interval,
  );
  TestValidator.predicate(
    "ranking has rank",
    typeof ranking.rank === "number" && ranking.rank > 0,
  );
  TestValidator.predicate(
    "ranking has controversy_score",
    typeof ranking.controversy_score === "number",
  );
  TestValidator.predicate(
    "has valid algorithm_version",
    typeof ranking.algorithm_version === "string",
  );
  TestValidator.predicate(
    "computed_at is non-empty string",
    typeof ranking.computed_at === "string" && ranking.computed_at.length > 0,
  );
  typia.assert(ranking.post); // post summary shape
  TestValidator.equals(
    "post id matches in post summary",
    ranking.post.id,
    sample.post_id,
  );

  // 3. Try to retrieve a ranking using a random (likely non-existent) postId but valid interval
  const invalidPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent postId should result in error",
    async () => {
      await api.functional.communityPlatform.controversialPostRankings.at(
        connection,
        {
          postId: invalidPostId,
          interval: sample.interval,
        },
      );
    },
  );

  // 4. Try to retrieve a ranking using a valid postId but obviously wrong interval
  await TestValidator.error(
    "invalid interval should result in error",
    async () => {
      await api.functional.communityPlatform.controversialPostRankings.at(
        connection,
        {
          postId: sample.post_id,
          interval: "completely_unknown_interval",
        },
      );
    },
  );

  // 5. Unauthenticated connections should work (endpoint is public)
  // This is already tested above: no authentication/login calls are made.
}
