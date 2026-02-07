import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
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

export async function test_api_community_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin via authorization utility
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Step 2: Define input parameters for community creation
  const name = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  // Step 3: Create community using utility function
  const community = await generate_random_community_admin_communities_create(
    adminConnection,
    {
      body: {
        name,
        description,
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 4: Validate business logic only (NOT types)
  TestValidator.equals("community name matches input", (community as any).name, name);
  TestValidator.equals(
    "community description matches input",
    (community as any).description,
    description,
  );
  TestValidator.predicate(
    "description length within limit",
    description.length <= 500,
  );
}