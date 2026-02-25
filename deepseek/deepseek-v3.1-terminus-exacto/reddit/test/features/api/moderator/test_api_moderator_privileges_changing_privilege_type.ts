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

export async function test_api_moderator_privileges_changing_privilege_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account first
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a user to be assigned as moderator
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Assign the user as moderator to the community
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user.id,
          role_level: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // Create initial privilege assignment with 'delete_posts' type
  const initialPrivilege =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        params: { communityId: community.id, moderatorId: moderator.id },
        body: {
          privilege_type: "delete_posts",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
      },
    );
  typia.assert(initialPrivilege);
  // Update the privilege type to 'ban_users'
  const updatedPrivilege =
    await api.functional.communityPlatform.admin.communities.moderators.privileges.putByCommunityidAndModeratoridAndPrivilegeid(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        privilegeId: initialPrivilege.id,
        body: {
          privilege_type: "ban_users",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.IUpdate,
      },
    );
  typia.assert(updatedPrivilege);
  // Validate that the privilege type was updated correctly
  TestValidator.equals(
    "privilege type updated",
    updatedPrivilege.privilege_type,
    "ban_users",
  );
  TestValidator.notEquals(
    "privilege type changed",
    updatedPrivilege.privilege_type,
    initialPrivilege.privilege_type,
  );
  // Validate that assignment relationships are preserved
  TestValidator.equals(
    "moderator assignment preserved",
    updatedPrivilege.moderatorAssignment.id,
    moderator.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedPrivilege.moderatorAssignment.community.id,
    community.id,
  );
  // Validate that timestamps are properly managed
  TestValidator.predicate(
    "granted_at timestamp exists",
    updatedPrivilege.granted_at !== null,
  );
  TestValidator.equals(
    "revoked_at remains null",
    updatedPrivilege.revoked_at,
    null,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedPrivilege.deleted_at,
    null,
  );
}
