import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_karma_score_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Define karma score range parameters for negative scores (risk threshold)
  const negativeScoresRequest: ICommunityBbsKarmaScore.IRequest = {
    score_from: -1000,
    score_to: -1,
  } satisfies ICommunityBbsKarmaScore.IRequest;
  // Step 3: Perform range filter query for negative karma scores
  const negativeScoresResponse: IPageICommunityBbsKarmaScore.ISummary =
    await api.functional.communityBbs.admin.karma_scores.index(
      adminConnection,
      {
        body: negativeScoresRequest,
      },
    );
  typia.assert(negativeScoresResponse);
  TestValidator.equals(
    "negative scores response has data",
    negativeScoresResponse.data.length > 0,
    true,
  );
  // Step 4: Define karma score range parameters for positive scores
  const positiveScoresRequest: ICommunityBbsKarmaScore.IRequest = {
    score_from: 1,
    score_to: 1000,
  } satisfies ICommunityBbsKarmaScore.IRequest;
  // Step 5: Perform range filter query for positive karma scores
  const positiveScoresResponse: IPageICommunityBbsKarmaScore.ISummary =
    await api.functional.communityBbs.admin.karma_scores.index(
      adminConnection,
      {
        body: positiveScoresRequest,
      },
    );
  typia.assert(positiveScoresResponse);
  TestValidator.equals(
    "positive scores response has data",
    positiveScoresResponse.data.length > 0,
    true,
  );
  // Step 6: Validate all response items fall within requested score ranges
  // Validate negative scores
  for (const item of negativeScoresResponse.data) {
    TestValidator.predicate(
      "negative karma score in range",
      item.score >= -1000 && item.score <= -1,
    );
  }
  // Validate positive scores
  for (const item of positiveScoresResponse.data) {
    TestValidator.predicate(
      "positive karma score in range",
      item.score >= 1 && item.score <= 1000,
    );
  }
}
