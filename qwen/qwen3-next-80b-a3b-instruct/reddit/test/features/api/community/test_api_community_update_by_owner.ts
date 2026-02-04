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
export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner-specific connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformOwner.IJoin,
  });
  typia.assert(ownerAuth);
  // Step 2: Create a new community using the authenticated owner connection
  const newCommunity =
    await api.functional.communityPlatform.owner.communities.create(
      ownerConnection,
      {
        body: {} satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(newCommunity);
  // Step 3: Update community using authenticated owner connection
  // Since ICommunityPlatformCommunity.IUpdate is empty object {}, we use empty body
  const updatedCommunity =
    await api.functional.communityPlatform.owner.communities.update(
      ownerConnection,
      {
        communityCode: newCommunity.community_code,
        body: {} satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // Step 4: Validate that the update was successful and community code unchanged
  TestValidator.equals(
    "community code unchanged after update",
    updatedCommunity.community_code,
    newCommunity.community_code,
  );
  // Step 5: Verify only owner can update - test with unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-owner cannot update community", async () => {
    await api.functional.communityPlatform.owner.communities.update(
      guestConnection,
      {
        communityCode: newCommunity.community_code,
        body: {} satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  });
}
