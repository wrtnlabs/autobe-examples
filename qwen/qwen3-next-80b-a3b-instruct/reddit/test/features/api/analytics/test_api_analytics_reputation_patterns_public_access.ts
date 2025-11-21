import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBBSAnalyticsIRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsIRequest";
import type { ICommunityBBSAnalyticsReputationPatterns } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsReputationPatterns";

export async function test_api_analytics_reputation_patterns_public_access(
  connection: api.IConnection,
) {
  // Request body for reputation patterns analytics
  const requestBody: ICommunityBBSAnalyticsIRequest =
    typia.random<ICommunityBBSAnalyticsIRequest>();

  // Call the public analytics endpoint
  const result: ICommunityBBSAnalyticsReputationPatterns =
    await api.functional.communityBBS.analytics.reputation_patterns.index(
      connection,
      { body: requestBody },
    );

  // Validate the response type and content
  typia.assert(result);
}
