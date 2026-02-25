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

export async function test_api_moderator_multiple_privilege_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Test Admin",
      permissions_level: "super_admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAuthorized.email,
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  await authorize_user_login(userConnection, {
    body: {
      email: userAuthorized.email,
      password: "user123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. Create community using utility function
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
  // 4. Assign user as moderator using utility function
  const moderatorAssignment =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          user_id: userAuthorized.id,
          role_level: "senior_moderator",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Grant multiple distinct privileges using utility function
  const privilegeTypes = [
    "delete_posts",
    "ban_users",
    "manage_moderators",
  ] as const;
  const grantedPrivileges: ICommunityPlatformModeratorAssignmentPrivilege[] =
    [];
  for (const privilegeType of privilegeTypes) {
    const privilege =
      await generate_random_community_platform_admin_communities_moderators_privileges_create(
        adminConnection,
        {
          body: {
            privilege_type: privilegeType,
          } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
          params: {
            communityId: community.id,
            moderatorId: moderatorAssignment.id,
          },
        },
      );
    typia.assert(privilege);
    grantedPrivileges.push(privilege);
  }
  // 6. Validate each privilege is recorded independently
  TestValidator.equals(
    "should have three privileges",
    grantedPrivileges.length,
    3,
  );
  // Check unique privilege types
  const uniqueTypes = new Set(grantedPrivileges.map((p) => p.privilege_type));
  TestValidator.equals(
    "should have three unique privilege types",
    uniqueTypes.size,
    3,
  );
  // Check that each privilege has its own grant timestamp
  const grantTimestamps = grantedPrivileges.map((p) => p.granted_at);
  const uniqueTimestamps = new Set(grantTimestamps);
  TestValidator.equals(
    "each privilege should have unique grant timestamp",
    uniqueTimestamps.size,
    3,
  );
  // Verify all privilege types are present
  TestValidator.predicate(
    "should have delete_posts privilege",
    grantedPrivileges.some((p) => p.privilege_type === "delete_posts"),
  );
  TestValidator.predicate(
    "should have ban_users privilege",
    grantedPrivileges.some((p) => p.privilege_type === "ban_users"),
  );
  TestValidator.predicate(
    "should have manage_moderators privilege",
    grantedPrivileges.some((p) => p.privilege_type === "manage_moderators"),
  );
  // 7. Verify privilege separation
  grantedPrivileges.forEach((privilege, index) => {
    TestValidator.predicate(
      `privilege ${index} should have moderator assignment`,
      privilege.moderatorAssignment !== undefined,
    );
    TestValidator.predicate(
      `privilege ${index} should have valid grant timestamp`,
      privilege.granted_at !== undefined && privilege.granted_at.length > 0,
    );
    TestValidator.predicate(
      `privilege ${index} should not be revoked`,
      privilege.revoked_at === null,
    );
    TestValidator.predicate(
      `privilege ${index} should not be deleted`,
      privilege.deleted_at === null,
    );
  });
}
