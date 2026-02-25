import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_admin_communities_moderators_create } from "../../../generate/generate_random_community_platform_admin_communities_moderators_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_privilege_revocation_nonexistent_privilege(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create a regular user who will become a moderator
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create authenticated user connection for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: user.email,
      password: "user123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 3,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Assign user as moderator
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user.id,
          role_level: "moderator",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // Attempt to revoke non-existent privilege
  const nonExistentPrivilegeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("revoke non-existent privilege", async () => {
    await api.functional.communityPlatform.admin.communities.moderators.privileges.erase(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        privilegeId: nonExistentPrivilegeId,
      },
    );
  });
}
