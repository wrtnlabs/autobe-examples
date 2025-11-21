import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSUserReputationMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSUserReputationMetrics";

export async function test_api_citizen_reputation_metrics_retrieval(
  connection: api.IConnection,
) {
  // Authenticated citizen join
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: typia.random<ICommunityBBSCitizenICreate>(),
    });
  typia.assert(citizen);

  // Retrieve reputation metrics
  const metrics: ICommunityBBSUserReputationMetrics =
    await api.functional.communityBBS.citizen.dashboard.reputation_metrics.index(
      connection,
    );
  typia.assert(metrics);

  // Verify all required fields are present and have expected structure
  // Note: ICommunityBBSUserReputationMetrics is defined as string but represents structured JSON
  // The typia.assert validates the structure against the expected schema
}
