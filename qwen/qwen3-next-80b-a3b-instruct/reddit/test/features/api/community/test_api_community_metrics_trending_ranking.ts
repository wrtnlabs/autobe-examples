import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunityMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMetrics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunityMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityMetrics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_metrics_trending_ranking(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Call the API endpoint to get community metrics
  const result: IPageICommunityBbsCommunityMetrics.ISummary =
    await api.functional.communityBbs.admin.analytics.communities.metrics.index(
      adminConnection,
    );
  typia.assert(result);
  // Step 3: Validate pagination structure
  TestValidator.equals("pagination limit is 50", result.pagination.limit, 50);
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  // Step 4: Validate that all returned communities have at least 10 active_subscribers
  result.data.forEach((community) => {
    TestValidator.predicate(
      "community has at least 10 active_subscribers",
      community.active_subscribers >= 10,
    );
  });
  // Step 5: Validate that the results are sorted by trending_score in descending order
  // Instead of TestValidator.index (which requires IEntity), validate by checking adjacent pairs
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `community at index ${i} has trending_score >= community at index ${i + 1}`,
      result.data[i].trending_score >= result.data[i + 1].trending_score,
    );
  }
  // Step 6: Validate that the returned data doesn't exceed 50 results
  TestValidator.predicate(
    "results don't exceed limit",
    result.data.length <= 50,
  );
  // Step 7: Verify that all communities in result have at least as many active_subscribers as the minimum threshold
  if (result.data.length > 0) {
    const minActiveSubscribers = Math.min(
      ...result.data.map((c) => c.active_subscribers),
    );
    TestValidator.predicate(
      "minimum active_subscribers meets threshold",
      minActiveSubscribers >= 10,
    );
  }
}
