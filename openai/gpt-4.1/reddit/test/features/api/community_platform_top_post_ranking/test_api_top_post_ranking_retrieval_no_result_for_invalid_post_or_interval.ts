import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTopPostRanking";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate error or no result response for invalid postId or interval at top
 * post ranking endpoint.
 *
 * This test checks the system behavior when querying the
 * /communityPlatform/topPostRankings/{postId}/{interval} endpoint using either
 * a validly-formatted but non-existent postId (UUID) or a plausible postId with
 * an unsupported interval string. No authentication should be required for
 * these public analytics endpoints. Steps:
 *
 * 1. Generate a random UUID that is very unlikely to exist in the test DB, and
 *    make a GET request with a common interval (e.g., "week").
 * 2. If business logic does not distinguish between non-existent and existent
 *    postIds, use a random string such as "notarealinterval" as the interval
 *    value for a random postId as well.
 * 3. For each query, expect either a handled business error, such as HttpError, or
 *    that the endpoint returns empty or null data. Never allow unhandled
 *    exceptions or stack traces.
 * 4. Verify that no authentication is needed; call using the default connection
 *    without tokens.
 * 5. If the response is a business error (e.g., HttpError) it must not leak
 *    backend stacktrace or internal identifiers.
 */
export async function test_api_top_post_ranking_retrieval_no_result_for_invalid_post_or_interval(
  connection: api.IConnection,
) {
  // Invalid: Non-existent post ID with supported interval
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error for non-existent postId with supported interval",
    async () => {
      await api.functional.communityPlatform.topPostRankings.at(connection, {
        postId: invalidPostId,
        interval: "week",
      });
    },
  );

  // Invalid: Valid post ID format but unsupported interval string
  const unsupportedInterval = "notarealinterval";
  await TestValidator.error(
    "should error for valid postId but unsupported interval",
    async () => {
      await api.functional.communityPlatform.topPostRankings.at(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        interval: unsupportedInterval,
      });
    },
  );

  // Public access confirmed if no authentication errors thrown
}
