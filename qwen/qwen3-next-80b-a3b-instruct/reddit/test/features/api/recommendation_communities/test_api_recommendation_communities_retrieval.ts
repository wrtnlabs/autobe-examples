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
export async function test_api_recommendation_communities_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies ICommunityBbsMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // Step 2: Call the communities recommendation endpoint with pagination parameters
  const recommendationRequest: ICommunityBbsRecommendation.IRequest = {
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
    >(),
    offset: 0,
    recommendation_score_threshold: typia.random<
      number & tags.Minimum<0> & tags.Maximum<1>
    >(),
  } satisfies ICommunityBbsRecommendation.IRequest;
  const response: IPageICommunityBbsRecommendation.ISummary =
    await api.functional.communityBbs.member.recommendations.communities.index(
      memberConnection,
      { body: recommendationRequest },
    );
  typia.assert(response);
  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 4: Validate data structure and business logic
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // If recommendations exist, validate their structure and ordering
  if (response.data.length > 0) {
    // Validate each recommendation has the correct structure
    for (const recommendation of response.data) {
      TestValidator.equals(
        "recommendation id is uuid",
        typeof recommendation.id === "string" &&
          /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(recommendation.id),
        true,
      );
      TestValidator.equals(
        "recommendation type is either community or post",
        recommendation.type === "community" || recommendation.type === "post",
        true,
      );
      TestValidator.predicate(
        "recommendation score is between 0 and 1",
        recommendation.recommendation_score >= 0 &&
          recommendation.recommendation_score <= 1,
      );
      TestValidator.predicate(
        "reference id is either uuid or null",
        recommendation.reference_id === null ||
          (typeof recommendation.reference_id === "string" &&
            /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(
              recommendation.reference_id,
            )),
      );
    }
    // Validate recommendations are ordered by recommendation_score in descending order (critical business requirement)
    for (let i = 0; i < response.data.length - 1; i++) {
      TestValidator.predicate(
        `recommendations ordered by score descending: ${i} >= ${i + 1}`,
        response.data[i].recommendation_score >=
          response.data[i + 1].recommendation_score,
      );
    }
    // Validate threshold behavior: all scores should be >= recommendation_score_threshold if provided
    if (recommendationRequest.recommendation_score_threshold !== undefined) {
      for (const recommendation of response.data) {
        TestValidator.predicate(
          "recommendations respect threshold",
          recommendation.recommendation_score >=
            recommendationRequest.recommendation_score_threshold,
        );
      }
    }
  }
}