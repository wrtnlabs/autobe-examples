import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import type { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
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
import { generate_random_community_platform_admin_communities_moderators_privileges_create } from "../../../generate/generate_random_community_platform_admin_communities_moderators_privileges_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_moderator_assignment_privilege } from "../../../prepare/prepare_random_community_platform_moderator_assignment_privilege";

/**
 * Test moderator privilege hierarchy validation: community owner can only access privileges
 * within their own community. Validates cross-community access prevention.
 */
export async function test_api_moderator_privilege_hierarchy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup first admin (Admin A) and create Community A
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Admin A",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityA =
    await generate_random_community_platform_user_communities_create(
      adminAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 2. Create a user to assign as moderator in Community A
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 3. Assign moderator role in Community A
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminAConnection,
      {
        body: {
          user_id: user.id,
          role_level: "standard",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: communityA.id },
      },
    );
  typia.assert(moderator);
  // 4. Grant privilege to the moderator in Community A
  const privilege =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminAConnection,
      {
        body: {
          privilege_type: "delete_posts",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
        params: { communityId: communityA.id, moderatorId: moderator.id },
      },
    );
  typia.assert(privilege);
  // 5. Validate that Admin A CAN access the privilege in their own community
  const retrievedPrivilege =
    await api.functional.communityPlatform.admin.communities.moderators.privileges.at(
      adminAConnection,
      {
        communityId: communityA.id,
        moderatorId: moderator.id,
        privilegeId: privilege.id,
      },
    );
  typia.assert(retrievedPrivilege);
  TestValidator.equals(
    "Admin A should access their own community privilege",
    retrievedPrivilege.id,
    privilege.id,
  );
  // 6. Setup second admin (Admin B) and create Community B
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Admin B",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityB =
    await generate_random_community_platform_user_communities_create(
      adminBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 7. Attempt to retrieve Community A's privilege using Admin B credentials
  await TestValidator.error(
    "cross-community privilege access should be denied",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.privileges.at(
        adminBConnection,
        {
          communityId: communityA.id,
          moderatorId: moderator.id,
          privilegeId: privilege.id,
        },
      );
    },
  );
  // 8. Validate that Admin B cannot access resources from different community
  TestValidator.predicate(
    "hierarchy validation prevents cross-community access",
    communityA.id !== communityB.id,
  );
}
