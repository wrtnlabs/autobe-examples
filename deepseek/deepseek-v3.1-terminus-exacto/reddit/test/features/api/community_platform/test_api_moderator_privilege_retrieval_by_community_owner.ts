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
 * Test that a community owner can successfully retrieve moderator privilege details.
 *
 * This test validates the complete moderator privilege retrieval workflow:
 * 1. Admin creates community and assigns moderator
 * 2. Regular user is registered and assigned as moderator
 * 3. Privilege is granted to the moderator
 * 4. Privilege details are retrieved and validated
 */
export async function test_api_moderator_privilege_retrieval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create community as admin
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. User setup (to become moderator)
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 4. Assign user as moderator
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          user_id: user.id,
          role_level: "standard",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. Grant privilege to moderator
  const privilege =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        body: {
          privilege_type: "delete_posts",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
        params: {
          communityId: community.id,
          moderatorId: moderator.id,
        },
      },
    );
  typia.assert(privilege);
  // 6. Retrieve privilege details
  const retrievedPrivilege =
    await api.functional.communityPlatform.admin.communities.moderators.privileges.at(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        privilegeId: privilege.id,
      },
    );
  typia.assert(retrievedPrivilege);
  // 7. Validate privilege details
  TestValidator.equals(
    "privilege type matches",
    retrievedPrivilege.privilege_type,
    "delete_posts",
  );
  TestValidator.predicate(
    "granted_at is set",
    retrievedPrivilege.granted_at !== null,
  );
  TestValidator.equals(
    "revoked_at is null",
    retrievedPrivilege.revoked_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedPrivilege.deleted_at,
    null,
  );
  // 8. Validate moderator assignment relationship
  TestValidator.equals(
    "moderator assignment id matches",
    retrievedPrivilege.moderatorAssignment.id,
    moderator.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedPrivilege.moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "assigned user id matches",
    retrievedPrivilege.moderatorAssignment.assignedUser.id,
    user.id,
  );
}
