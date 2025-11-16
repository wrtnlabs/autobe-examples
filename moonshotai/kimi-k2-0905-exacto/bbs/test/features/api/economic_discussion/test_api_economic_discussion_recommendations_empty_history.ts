import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategorySummary";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendation";
import type { IEconomicDiscussionRecommendationsList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsList";
import type { IEconomicDiscussionRecommendationsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test personalized recommendations for new members with empty history.
 *
 * This test validates that the recommendation system gracefully handles new
 * members who have no browsing history, search activity, or interaction data.
 * It ensures that such users still receive meaningful content suggestions,
 * preventing system failures when dealing with empty recommendation datasets.
 *
 * Steps:
 *
 * 1. Register a new member account with unique credentials
 * 2. Request personalized recommendations with empty history parameters
 * 3. Validate that recommendations are returned successfully
 * 4. Verify that the recommendation list contains appropriate default content
 * 5. Check pagination metadata and response structure
 */
export async function test_api_economic_discussion_recommendations_empty_history(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRequestBody = {
    username: RandomGenerator.name(3)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const newMember = await api.functional.auth.member.join(connection, {
    body: memberRequestBody,
  });
  typia.assert(newMember);

  // Step 2: Request personalized recommendations with empty history
  const recommendationRequestBody = {
    categoryIds: undefined,
    searchKeywords: undefined,
    interactionHistory: [],
    maxResults: 10,
    minRelevanceScore: 0.5,
  } satisfies IEconomicDiscussionRecommendationsRequest;

  const recommendations =
    await api.functional.economicDiscussion.member.discovery.recommendations.index(
      connection,
      {
        body: recommendationRequestBody,
      },
    );
  typia.assert(recommendations);

  // Step 3: Validate successful recommendation retrieval
  TestValidator.equals(
    "recommendations retrieved successfully",
    recommendations.data.length > 0,
    true,
  );

  TestValidator.predicate(
    "pagination metadata exists",
    recommendations.pagination !== undefined &&
      recommendations.pagination !== null,
  );

  TestValidator.predicate(
    "pagination fields are valid",
    recommendations.pagination.current !== undefined &&
      recommendations.pagination.pages !== undefined &&
      recommendations.pagination.limit !== undefined &&
      recommendations.pagination.records !== undefined,
  );

  // Step 4: Validate recommendation structure
  TestValidator.predicate(
    "all recommendations have required fields",
    recommendations.data.every(
      (rec) =>
        rec.id !== undefined &&
        rec.title !== undefined &&
        rec.content !== undefined &&
        rec.authorName !== undefined &&
        rec.relevanceScore !== undefined &&
        rec.createdAt !== undefined &&
        rec.updatedAt !== undefined,
    ),
  );

  TestValidator.predicate(
    "relevance scores are within valid range",
    recommendations.data.every(
      (rec) => rec.relevanceScore >= 0 && rec.relevanceScore <= 1,
    ),
  );

  TestValidator.predicate(
    "category counts are valid",
    recommendations.data.every(
      (rec) => rec.categoryCount >= 0 && rec.categoryCount <= 50,
    ),
  );

  TestValidator.predicate(
    "view counts are valid",
    recommendations.data.every(
      (rec) => rec.viewCount >= 0 && rec.viewCount <= 1000000,
    ),
  );

  TestValidator.predicate(
    "comment counts are valid",
    recommendations.data.every(
      (rec) => rec.commentCount >= 0 && rec.commentCount <= 10000,
    ),
  );

  // Step 5: Validate individual recommendation properties
  const exampleRecommendation = recommendations.data[0];
  if (exampleRecommendation) {
    TestValidator.predicate(
      "recommendation ID is valid UUID",
      typia.is<string & tags.Format<"uuid">>(exampleRecommendation.id),
    );

    TestValidator.predicate(
      "createdAt and updatedAt are valid date-times",
      typia.is<string & tags.Format<"date-time">>(
        exampleRecommendation.createdAt,
      ) &&
        typia.is<string & tags.Format<"date-time">>(
          exampleRecommendation.updatedAt,
        ),
    );

    TestValidator.equals(
      "categories array exists",
      Array.isArray(exampleRecommendation.categories),
      true,
    );
  }
}
