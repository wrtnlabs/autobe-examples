import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
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

export async function test_api_moderator_assignment_update_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connections
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin2Connection: api.IConnection = { host: connection.host };
  // Create admin users and authenticate
  await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin One",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin Two",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create regular user connection for community owner
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create target user for moderator assignment
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(targetUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "target123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(targetUser);
  // Admin1 creates moderator assignment
  const assignment =
    await generate_random_community_platform_admin_communities_moderators_create(
      admin1Connection,
      {
        params: { communityId: community.id },
        body: {
          user_id: targetUser.id,
          role_level: "moderator",
          notes: "Initial assignment by admin1",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);
  // Admin2 attempts to update assignment created by admin1 (should fail)
  await TestValidator.error(
    "admin2 cannot update assignment created by admin1",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.update(
        admin2Connection,
        {
          communityId: community.id,
          moderatorId: assignment.id,
          body: {
            notes: "Unauthorized update attempt by admin2",
          } satisfies ICommunityPlatformModeratorAssignment.IUpdate,
        },
      );
    },
  );
  // Admin1 successfully updates their own assignment
  const updatedAssignment =
    await api.functional.communityPlatform.admin.communities.moderators.update(
      admin1Connection,
      {
        communityId: community.id,
        moderatorId: assignment.id,
        body: {
          notes: "Updated by original creator admin1",
        } satisfies ICommunityPlatformModeratorAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  TestValidator.equals(
    "notes updated by admin1",
    updatedAssignment.notes,
    "Updated by original creator admin1",
  );
}
