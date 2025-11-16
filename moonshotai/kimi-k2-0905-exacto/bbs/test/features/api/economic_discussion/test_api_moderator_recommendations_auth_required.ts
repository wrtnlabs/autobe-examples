import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategorySummary";
import type { IEconomicDiscussionRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendation";
import type { IEconomicDiscussionRecommendationsList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsList";
import type { IEconomicDiscussionRecommendationsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_moderator_recommendations_auth_required(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection to test access denial
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test that accessing moderator recommendations without authentication fails
  await TestValidator.error(
    "should reject unauthenticated access to moderator recommendations",
    async () => {
      await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
        unauthConn,
        {
          body: {
            maxResults: 10,
            minRelevanceScore: 0.5,
            searchKeywords: ["economy", "policy"],
          } satisfies IEconomicDiscussionRecommendationsRequest,
        },
      );
    },
  );

  // Test with invalid/empty headers
  const emptyHeadersConn: api.IConnection = {
    ...connection,
    headers: { authorization: "invalid" },
  };

  await TestValidator.error(
    "should reject invalid authentication to moderator recommendations",
    async () => {
      await api.functional.economicDiscussion.moderator.discovery.recommendations.index(
        emptyHeadersConn,
        {
          body: {
            maxResults: 15,
            categoryIds: [typia.random<string & tags.Format<"uuid">>()],
            minRelevanceScore: 0.7,
          } satisfies IEconomicDiscussionRecommendationsRequest,
        },
      );
    },
  );
}
