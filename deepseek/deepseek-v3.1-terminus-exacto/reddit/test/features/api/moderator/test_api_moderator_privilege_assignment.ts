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

export async function test_api_moderator_privilege_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Test Admin",
      permissions_level: "super_admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  // Assign user as moderator to the community
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          user_id: user.id,
          role_level: "moderator",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: { communityId: community.id },
      },
    );
  // Grant first privilege (delete_posts)
  const privilege1 =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        body: {
          privilege_type: "delete_posts",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
        params: { communityId: community.id, moderatorId: moderator.id },
      },
    );
  typia.assert(privilege1);
  // Grant second privilege (ban_users)
  const privilege2 =
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        body: {
          privilege_type: "ban_users",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
        params: { communityId: community.id, moderatorId: moderator.id },
      },
    );
  typia.assert(privilege2);
  // Validate privilege assignments
  TestValidator.equals(
    "privilege1 type",
    privilege1.privilege_type,
    "delete_posts",
  );
  TestValidator.equals(
    "privilege2 type",
    privilege2.privilege_type,
    "ban_users",
  );
  TestValidator.predicate(
    "privilege1 granted_at valid",
    privilege1.granted_at !== null,
  );
  TestValidator.predicate(
    "privilege2 granted_at valid",
    privilege2.granted_at !== null,
  );
  TestValidator.equals(
    "privilege1 revoked_at null",
    privilege1.revoked_at,
    null,
  );
  TestValidator.equals(
    "privilege2 revoked_at null",
    privilege2.revoked_at,
    null,
  );
  TestValidator.equals(
    "privilege1 deleted_at null",
    privilege1.deleted_at,
    null,
  );
  TestValidator.equals(
    "privilege2 deleted_at null",
    privilege2.deleted_at,
    null,
  );
  // Validate moderator assignment relationship
  TestValidator.equals(
    "privilege1 moderator assignment id",
    privilege1.moderatorAssignment.id,
    moderator.id,
  );
  TestValidator.equals(
    "privilege2 moderator assignment id",
    privilege2.moderatorAssignment.id,
    moderator.id,
  );
  // Test duplicate privilege assignment prevention
  await TestValidator.error("duplicate privilege assignment", async () => {
    await generate_random_community_platform_admin_communities_moderators_privileges_create(
      adminConnection,
      {
        body: {
          privilege_type: "delete_posts",
        } satisfies ICommunityPlatformModeratorAssignmentPrivilege.ICreate,
        params: { communityId: community.id, moderatorId: moderator.id },
      },
    );
  });
}
