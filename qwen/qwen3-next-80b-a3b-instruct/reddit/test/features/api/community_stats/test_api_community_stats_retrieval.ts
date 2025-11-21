import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCommunityStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunityStats";

export async function test_api_community_stats_retrieval(
  connection: api.IConnection,
) {
  // First, create a citizen account to generate foundational activity data for statistics aggregation
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // Then, retrieve the aggregated community statistics
  const stats: ICommunityBBSCommunityStats =
    await api.functional.communityBBS.dashboard.community_stats.index(
      connection,
    );
  typia.assert(stats);
}
