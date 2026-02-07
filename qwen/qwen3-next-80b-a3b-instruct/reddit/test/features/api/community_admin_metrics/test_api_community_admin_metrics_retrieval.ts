import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_communities_create } from "../../../generate/generate_random_community_admin_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_admin_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication: Join as admin to establish credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create a community using the admin connection
  const community = await generate_random_community_admin_communities_create(
    adminConnection,
    {
      body: {} satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Cast community to include id property (as per API behavior despite empty DTO definition)
  const communityWithId = community as ICommunityCommunity & {
    id: string;
  };
  // 4. Retrieve metrics for the created community using the correct path
  const metrics = await api.functional.community.admin.communities.metrics.at(
    adminConnection,
    {
      communityId: communityWithId.id, // Now safe to access because we've cast
    },
  );
  typia.assert(metrics);
  // 5. Validate that metrics object is present and structured as expected
  // Since ICommunityUsageMetric is empty in DTO, we validate only existence of the object
  // and the fact that typia.assert() passed. We also check for at least one property
  // Based on scenario, we expect exactly four metrics: subscriber count, post count, comment count, vote count
  // But since the interface is empty, we use typia.assert() for type safety and TestValidator for existential validation
  TestValidator.predicate(
    "metrics object has properties",
    Object.keys(metrics).length >= 4,
  );
}
