import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSAnalyticsCommunityPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsCommunityPerformance";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_community_performance_analysis_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // Step 2: Retrieve community performance analytics
  const analytics: ICommunityBBSAnalyticsCommunityPerformance =
    await api.functional.communityBBS.moderator.analytics.community_performance.index(
      connection,
      {
        body: "",
      },
    );
  typia.assert(analytics);
}
