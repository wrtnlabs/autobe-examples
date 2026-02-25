import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test that platform administrator can successfully update a community with partial field updates.
 * First authenticate as admin via admin login endpoint. Then create a user account and authenticate as user.
 * As user, create a community as prerequisite. As admin, update the community with partial data
 * (only description and optional icon_url). Verify the response contains updated community object
 * with proper fields updated while preserving immutable fields like id, owner, created_at.
 * Validate that updated_at timestamp changes. Confirm that partial update allows updating only
 * specified fields without affecting unspecified fields. Test that permission validation works -
 * admin has authorizationActor 'admin' so they should be authorized to update any community
 * regardless of ownership.
 */
export async function test_api_community_admin_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!" satisfies string &
        tags.Format<"password"> as string,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create and authenticate regular user account (for community ownership)
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPassword123!" satisfies string &
      tags.Format<"password"> as string,
    username: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;
  const registeredUser = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(registeredUser);
  // Step 3: Create initial community as regular user
  const community =
    await api.functional.communityPlatform.user.communities.create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Store original values for comparison
  const originalCommunity = community;
  // Step 4: Admin updates the community with partial fields
  const updateData = {
    description: RandomGenerator.paragraph({ sentences: 5 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunity.IUpdate;
  const updatedCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      adminConnection,
      {
        communityId: originalCommunity.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);
  // Step 5: Validate response structure and field updates
  // Verify immutable fields remain unchanged
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "owner remains unchanged",
    updatedCommunity.owner.id,
    originalCommunity.owner.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedCommunity.created_at,
    originalCommunity.created_at,
  );
  // Verify specified fields are updated
  TestValidator.equals(
    "description is updated",
    updatedCommunity.description,
    updateData.description!,
  );
  TestValidator.equals(
    "icon_url is updated",
    updatedCommunity.icon_url,
    updateData.icon_url!,
  );
  // Verify unspecified field (name) remains unchanged
  TestValidator.equals(
    "name remains unchanged",
    updatedCommunity.name,
    originalCommunity.name,
  );
  // Verify updated_at timestamp changed (should be newer)
  TestValidator.predicate(
    "updated_at timestamp is updated",
    new Date(updatedCommunity.updated_at) >
      new Date(originalCommunity.updated_at),
  );
}
