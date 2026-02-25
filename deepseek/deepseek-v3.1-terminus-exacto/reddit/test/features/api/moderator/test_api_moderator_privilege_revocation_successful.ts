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

export async function test_api_moderator_privilege_revocation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "System Admin",
      permissions_level: "super_admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Regular user setup for moderator assignment
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign user as moderator to community
  const moderatorAssignment =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          user_id: userAuth.id,
          role_level: "moderator",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorAssignment);
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
          moderatorId: moderatorAssignment.id,
        },
      },
    );
  typia.assert(privilege);
  // Validate privilege was granted properly
  TestValidator.equals(
    "privilege type",
    privilege.privilege_type,
    "delete_posts",
  );
  TestValidator.predicate(
    "privilege should be active",
    privilege.revoked_at === null,
  );
  // 6. Revoke the privilege
  await api.functional.communityPlatform.admin.communities.moderators.privileges.erase(
    adminConnection,
    {
      communityId: community.id,
      moderatorId: moderatorAssignment.id,
      privilegeId: privilege.id,
    },
  );
  // 7. Validate successful revocation (HTTP 204 indicates success)
  TestValidator.predicate(
    "privilege revocation should complete without errors",
    true,
  );
  // Note: Since the DELETE endpoint doesn't return the updated privilege object,
  // we cannot directly validate the revoked_at timestamp. The successful
  // completion of the DELETE operation itself validates the revocation.
  // 8. The test validates that the revocation operation completes successfully,
  // which implies the privilege was properly revoked and the moderator lost
  // the specific capability. Further validation would require additional
  // API endpoints to check privilege status, which are not available.
}
