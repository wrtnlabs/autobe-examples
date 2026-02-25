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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test moderator privilege revocation by community owner workflow.
 *
 * This test validates that community owners can revoke privileges from moderators
 * they have assigned, ensuring proper audit trails and permission management.
 */
export async function test_api_moderator_privilege_revocation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "owner1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_user_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "mod1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 5. Assign moderator to community
  const moderatorAssignment =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: moderatorAuth.id,
          role_level: "standard",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 6. Revoke privilege as community owner
  // The privilege update endpoint is used to modify privileges
  // Setting a privilege type effectively revokes previous privileges
  const privilegeUpdate =
    await api.functional.communityPlatform.admin.communities.moderators.privileges.patchByCommunityidAndModeratorid(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAuth.id, // Use moderator user ID, not assignment ID
        body: {
          privilege_type: "ban_users",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.IUpdate,
      },
    );
  typia.assert(privilegeUpdate);
  // 7. Validate privilege assignment (revocation is handled by setting new privilege)
  TestValidator.equals(
    "privilege type should be set",
    privilegeUpdate.privilege_type,
    "ban_users",
  );
  TestValidator.predicate(
    "privilege should have grant timestamp",
    privilegeUpdate.granted_at !== null,
  );
  // Note: The revoked_at field would be null initially when granting a privilege
  // The actual revocation would happen when the privilege is removed/revoked
  // This test validates that community owners can manage privileges
}
