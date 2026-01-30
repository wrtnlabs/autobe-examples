import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsRecommendation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsRecommendation";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_recommendation_fetch_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  // Step 2: Generate recommendation request with default threshold (0.7)
  const request: ICommunityBbsRecommendation.IRequest = {
    limit: 10,
    offset: 0,
  } satisfies ICommunityBbsRecommendation.IRequest;
  // Step 3: Fetch personalized recommendations
  const recommendations: IPageICommunityBbsRecommendation.ISummary =
    await api.functional.communityBbs.content.recommendations.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(recommendations);
  // Step 4: Validate each recommendation item
  recommendations.data.forEach((recommendation) => {
    // Validate UUID format for id
    TestValidator.predicate(
      "recommendation id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        recommendation.id,
      ),
    );
    // Validate type is either 'community' or 'post'
    TestValidator.predicate(
      "recommendation type is valid",
      recommendation.type === "community" || recommendation.type === "post",
    );
    // Validate recommendation score meets minimum threshold (default 0.7)
    TestValidator.predicate(
      "recommendation score meets minimum threshold of 0.7",
      recommendation.recommendation_score >= 0.7,
    );
    // Validate reference_id is either a UUID or null
    if (recommendation.reference_id !== null) {
      TestValidator.predicate(
        "recommendation reference_id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          recommendation.reference_id,
        ),
      );
    }
  });
  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "page has limit of 10",
    recommendations.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page has current page 1",
    recommendations.pagination.current,
    1,
  );
  TestValidator.equals(
    "page data contains exactly 10 items",
    recommendations.data.length,
    10,
  );
  TestValidator.predicate(
    "page has at least 10 total records (enough to fill a page)",
    recommendations.pagination.records >= 10,
  );
  TestValidator.predicate(
    "page has reasonable number of pages",
    recommendations.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "total records >= limit",
    recommendations.pagination.records >= recommendations.pagination.limit,
  );
}
