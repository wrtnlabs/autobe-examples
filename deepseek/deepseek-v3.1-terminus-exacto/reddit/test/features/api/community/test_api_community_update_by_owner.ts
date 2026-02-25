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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // Step 2: Create a community as the authenticated user
  const originalCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(originalCommunity);
  // Store original values for comparison
  const originalCreatedAt = originalCommunity.created_at;
  const originalUpdatedAt = originalCommunity.updated_at;
  const originalOwnerId = originalCommunity.owner.id;
  // Step 3: Prepare update data (partial update)
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  // Step 4: Call update endpoint
  const updatedCommunity =
    await api.functional.communityPlatform.user.communities.update(
      userConnection,
      {
        communityId: originalCommunity.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);
  // Step 5: Validate partial update - only provided fields changed
  TestValidator.equals(
    "name should be updated",
    updatedCommunity.name,
    updateData.name,
  );
  TestValidator.equals(
    "description should be updated",
    updatedCommunity.description,
    updateData.description,
  );
  TestValidator.equals(
    "icon_url should be updated",
    updatedCommunity.icon_url,
    updateData.icon_url,
  );
  // Step 6: Verify owner remains unchanged
  TestValidator.equals(
    "owner should remain unchanged",
    updatedCommunity.owner.id,
    originalOwnerId,
  );
  // Step 7: Verify timestamp behavior
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedCommunity.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );
}
