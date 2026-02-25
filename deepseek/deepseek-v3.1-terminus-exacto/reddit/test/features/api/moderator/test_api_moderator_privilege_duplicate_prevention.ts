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
 * Test that the system prevents duplicate privilege assignments when attempting to grant the same privilege type to a moderator who already has that privilege.
 */
export async function test_api_moderator_privilege_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Test Admin",
      permissions_level: "super_admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign user as moderator
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user.id,
          role_level: "senior_moderator",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. Grant initial privilege
  const privilegeType = "delete_posts";
  const initialPrivilege =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        params: { communityId: community.id, moderatorId: moderator.id },
        body: {
          privilege_type: privilegeType,
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
      },
    );
  typia.assert(initialPrivilege);
  // 6. Validate initial privilege assignment
  TestValidator.equals(
    "privilege type matches",
    initialPrivilege.privilege_type,
    privilegeType,
  );
  TestValidator.predicate(
    "privilege granted timestamp exists",
    initialPrivilege.granted_at !== null,
  );
  TestValidator.equals(
    "privilege is active",
    initialPrivilege.revoked_at,
    null,
  );
  // 7. Attempt to grant duplicate privilege
  await TestValidator.error("duplicate privilege assignment", async () => {
    await api.functional.communityPlatform.admin.communities.moderators.privileges.create(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        body: {
          privilege_type: privilegeType,
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
      },
    );
  });
  // 8. Validate privilege uniqueness
  TestValidator.predicate(
    "privilege assignment is unique",
    initialPrivilege.id !== null,
  );
}
