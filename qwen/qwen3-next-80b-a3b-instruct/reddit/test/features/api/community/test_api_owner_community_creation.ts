import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_owner_communities_create } from "../../../generate/generate_random_community_platform_owner_communities_create";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_community_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformOwner.IJoin,
    },
  );
  typia.assert(owner);
  // Step 2: Create a community with an empty request body per the ICommunityPlatformCommunity.ICreate schema definition (which is {})
  const community =
    await generate_random_community_platform_owner_communities_create(
      ownerConnection,
      {
        body: {} satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Verify community creation - only community_code is defined in the schema
  // There are no other properties in ICommunityPlatformCommunity type definition
  // Therefore, we can only validate the community_code exists and is a non-empty string
  TestValidator.predicate(
    "community_code is a non-empty string",
    typeof community.community_code === "string" &&
      community.community_code.length > 0,
  );
}
