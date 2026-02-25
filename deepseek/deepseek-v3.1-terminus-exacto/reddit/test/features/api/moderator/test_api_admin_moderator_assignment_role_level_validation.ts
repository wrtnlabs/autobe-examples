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

export async function test_api_admin_moderator_assignment_role_level_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAccount);
  // Create a regular user account for moderator assignment
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(user);
  // Create a community for moderator assignment
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Authenticate as admin to perform moderator operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAccount.email,
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Test moderator assignment with different valid role levels
  const validRoleLevels = [
    "moderator",
    "senior_moderator",
    "admin_moderator",
  ] as const;
  for (const roleLevel of validRoleLevels) {
    const moderator =
      await api.functional.communityPlatform.admin.communities.moderators.create(
        adminConnection,
        {
          communityId: community.id,
          body: {
            user_id: user.id,
            role_level: roleLevel,
            notes: `Assigned as ${roleLevel}`,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
    // Validate moderator assignment was successful
    TestValidator.equals(
      `moderator role level ${roleLevel} assignment`,
      moderator.role_level,
      roleLevel,
    );
    TestValidator.equals(
      `moderator user id ${roleLevel} assignment`,
      moderator.user.id,
      user.id,
    );
    TestValidator.equals(
      `moderator community id ${roleLevel} assignment`,
      moderator.community.id,
      community.id,
    );
    TestValidator.predicate(
      `moderator is active ${roleLevel}`,
      moderator.is_active === true,
    );
  }
}
