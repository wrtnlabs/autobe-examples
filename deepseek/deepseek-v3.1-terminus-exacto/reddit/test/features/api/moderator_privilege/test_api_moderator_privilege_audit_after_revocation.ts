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

export async function test_api_moderator_privilege_audit_after_revocation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create a user for moderator assignment
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community as the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign moderator to community
  const moderatorAssignment =
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
  typia.assert(moderatorAssignment);
  // 5. Grant privilege to moderator
  const privilege =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        params: {
          communityId: community.id,
          moderatorId: moderatorAssignment.id,
        },
        body: {
          privilege_type: "delete_posts",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
      },
    );
  typia.assert(privilege);
  // 6. Test GET endpoint for active privilege retrieval
  const activePrivilege =
    await api.functional.communityPlatform.admin.communities.moderators.privileges.at(
      adminConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
        privilegeId: privilege.id,
      },
    );
  typia.assert(activePrivilege);
  // 7. Validate active privilege data
  TestValidator.equals(
    "active privilege ID matches",
    activePrivilege.id,
    privilege.id,
  );
  TestValidator.equals(
    "active privilege type matches",
    activePrivilege.privilege_type,
    "delete_posts",
  );
  TestValidator.predicate(
    "active privilege granted_at is populated",
    activePrivilege.granted_at !== null,
  );
  TestValidator.equals(
    "active privilege revoked_at is null",
    activePrivilege.revoked_at,
    null,
  );
  TestValidator.equals(
    "active privilege deleted_at is null",
    activePrivilege.deleted_at,
    null,
  );
  // 8. NOTE: Since the API doesn't provide a direct revocation endpoint,
  // we can only test the current functionality. The scenario mentions
  // "revocation (simulated by calling privilege update with revoked_at timestamp)"
  // but no such update endpoint exists in the provided API functions.
  // Therefore, we test the audit functionality with the available active privilege.
  // 9. Additional validation for moderator assignment relationship
  TestValidator.equals(
    "moderator assignment ID matches",
    activePrivilege.moderatorAssignment.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "community ID matches in moderator assignment",
    activePrivilege.moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "assigned user ID matches",
    activePrivilege.moderatorAssignment.assignedUser.id,
    user.id,
  );
}
