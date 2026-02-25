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

export async function test_api_community_admin_update_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuthorized);
  // 2. Create community as regular user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 4. Admin updates the community with partial update (remove icon_url)
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    icon_url: null,
  } satisfies ICommunityPlatformCommunity.IUpdate;
  const updatedCommunity =
    await api.functional.communityPlatform.admin.communities.update(
      adminConnection,
      {
        communityId: community.id,
        body: updateData,
      },
    );
  typia.assert(updatedCommunity);
  // 5. Validate admin permissions override ownership
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "owner remains original creator",
    updatedCommunity.owner.id,
    community.owner.id,
  );
  TestValidator.equals(
    "owner username unchanged",
    updatedCommunity.owner.username,
    community.owner.username,
  );
  TestValidator.equals(
    "owner display name unchanged",
    updatedCommunity.owner.display_name,
    community.owner.display_name,
  );
  // 6. Validate partial update was applied correctly
  TestValidator.equals(
    "name was updated",
    updatedCommunity.name,
    updateData.name,
  );
  TestValidator.equals(
    "description was updated",
    updatedCommunity.description,
    updateData.description,
  );
  TestValidator.equals("icon_url was removed", updatedCommunity.icon_url, null);
  // 7. Validate system timestamps
  TestValidator.equals(
    "created_at remains unchanged",
    updatedCommunity.created_at,
    community.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed after admin update",
    updatedCommunity.updated_at,
    community.updated_at,
  );
  // 8. Validate immutable fields remain unchanged
  TestValidator.equals(
    "owner karma score unchanged",
    updatedCommunity.owner.karma,
    community.owner.karma,
  );
  TestValidator.equals(
    "owner avatar unchanged",
    updatedCommunity.owner.avatar_url,
    community.owner.avatar_url,
  );
  TestValidator.equals(
    "owner creation date unchanged",
    updatedCommunity.owner.created_at,
    community.owner.created_at,
  );
}
