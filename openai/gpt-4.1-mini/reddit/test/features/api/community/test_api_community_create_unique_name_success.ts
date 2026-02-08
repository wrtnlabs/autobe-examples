import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_unique_name_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join (authentication) setup
  const userConnection: api.IConnection = { host: connection.host };
  // Using authorize_user_join utility to register and authenticate a user
  const authorized = await authorize_user_join(userConnection, { body: {} });
  // Update userConnection with authorization token in headers for authenticated requests
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a unique community using utility
  const community1 = (await generate_random_community_platform_user_communities_create_community(
    userConnection,
    {
      body: { name: `test-community-${RandomGenerator.alphabets(10)}` },
    },
  )) as unknown as {
    id: string;
    name: string;
    created_at: string;
    owner_user_id: string;
  };
  typia.assert(community1);
  // 3. Attempt to create a second community with the same name to ensure uniqueness
  await TestValidator.error("duplicate community name", async () => {
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {
        body: { name: community1.name },
      },
    );
  });
  // 4. Create another community with a different name; must succeed
  const community2 = (await generate_random_community_platform_user_communities_create_community(
    userConnection,
    {
      body: { name: `test-community-${RandomGenerator.alphabets(10)}` },
    },
  )) as unknown as {
    id: string;
    name: string;
    created_at: string;
    owner_user_id: string;
  };
  typia.assert(community2);
  // 5. Validate that the two created communities have different IDs and different names
  TestValidator.notEquals("IDs differ", community1.id, community2.id);
  TestValidator.notEquals("Names differ", community1.name, community2.name);
  // 6. Validate response properties existence and format
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-fA-F-]{36}$/.test(community1.id),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    !isNaN(Date.parse(community1.created_at)),
  );
  TestValidator.predicate(
    "owner_user_id is non-empty string",
    typeof community1.owner_user_id === "string" &&
      community1.owner_user_id.length > 0,
  );
  // 7. Validate Location header format (0) - This is not directly testable here, so note that API returns 201 with Location header for created resource
}
