import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformHotPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHotPostRanking";

/**
 * Verify that hot ranking analytics for a specific post can be fetched publicly
 * (unauthenticated).
 *
 * This test retrieves the hot ranking for an existing post (using a random
 * UUID, as no fixture is set up) and ensures the API is reachable and returns
 * an object conforming to the expected schema. The response is validated for
 * shape, type, and correct field presence. The test then requests a hot ranking
 * for a random unknown postId and asserts (using TestValidator.equals) that the
 * response is null or absent, confirming that the API returns correct null
 * response for missing rankings. All interactions are performed without any
 * authentication context (pure public/anonymous connection) and confirmed
 * type-safe.
 */
export async function test_api_hot_post_ranking_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Fetch hot ranking for a (randomly generated) postId, simulating an existing post
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ranking: ICommunityPlatformHotPostRanking =
    await api.functional.communityPlatform.hotPostRankings.at(connection, {
      postId,
    });
  typia.assert(ranking);

  // 2. Fetch hot ranking for a non-existent postId (likely outcome: error or null-like result, but API contract requires type or error)
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("returns error for missing postId", async () => {
    await api.functional.communityPlatform.hotPostRankings.at(connection, {
      postId: nonExistentPostId,
    });
  });
}
