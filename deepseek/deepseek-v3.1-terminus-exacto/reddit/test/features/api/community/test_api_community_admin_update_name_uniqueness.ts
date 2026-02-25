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

export async function test_api_community_admin_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin account first
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_1234",
      display_name: "Test Admin",
      permissions_level: "full",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create first community
  const community1 =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name:
            "Community_" +
            typia.random<string & tags.Format<"uuid">>().substring(0, 8),
          description: "First test community description",
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Create second community with different name
  const community2 =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name:
            "Community_" +
            typia.random<string & tags.Format<"uuid">>().substring(0, 8),
          description: "Second test community description",
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Attempt to update first community with second community's name
  try {
    await api.functional.communityPlatform.admin.communities.update(
      adminConnection,
      {
        communityId: community1.id,
        body: {
          name: community2.name,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
    // If no error thrown, test fails
    throw new Error(
      "Expected duplicate community name error but none was thrown",
    );
  } catch (error) {
    // Should throw error for duplicate name
    if (!(error instanceof Error)) {
      throw error;
    }
  }
  // Verify both communities remain unchanged by updating description only
  const updatedCommunity1 =
    await api.functional.communityPlatform.admin.communities.update(
      adminConnection,
      {
        communityId: community1.id,
        body: {
          description: "Updated description for verification",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity1);
  if (updatedCommunity1.name !== community1.name) {
    throw new Error(
      `First community name changed from "${community1.name}" to "${updatedCommunity1.name}"`,
    );
  }
  const updatedCommunity2 =
    await api.functional.communityPlatform.admin.communities.update(
      adminConnection,
      {
        communityId: community2.id,
        body: {
          description: "Updated description for verification",
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity2);
  if (updatedCommunity2.name !== community2.name) {
    throw new Error(
      `Second community name changed from "${community2.name}" to "${updatedCommunity2.name}"`,
    );
  }
}
