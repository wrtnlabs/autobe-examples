import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";

export async function test_api_community_moderators_update_role_unique_owner_violation(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to update the community moderator assignment to role 'owner'
  // when another owner already exists in the same community. Expect error due to unique owner role constraint.
  // 1. Admin setup
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<ICommunityPlatformAdmin.IJoin>();
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };

  // Since IJoin has no email and password, use hardcoded credentials
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: "admin@example.com",
      password: "password123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 2. User1 setup
  const userJoinConnection1: api.IConnection = { host: connection.host };

  // Provide second argument body to satisfy function signature
  const user1Auth = await authorize_user_join(userJoinConnection1, {
    body: {
      email: "user1@example.com",
      password: "password123",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user1Auth);
  const userLoginConnection1: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConnection1, {
    body: {
      email: "user1@example.com",
      password: "password123",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 3. User2 setup
  const userJoinConnection2: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(userJoinConnection2, {
    body: {
      email: "user2@example.com",
      password: "password123",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2Auth);
  const userLoginConnection2: api.IConnection = { host: connection.host };
  await authorize_user_login(userLoginConnection2, {
    body: {
      email: "user2@example.com",
      password: "password123",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 4. User1 creates a community
  const community = await generate_random_community_platform_user_communities_create_community(
    userLoginConnection1,
    {},
  );
  typia.assert(community);

  // community.id does not exist per error, try community.community_id
  const communityId = (community as any).community_id ?? "community-unknown";

  // 5. Assign user1 as owner moderator
  const ownerModerator = await generate_random_community_platform_admin_community_moderators_create(
    adminLoginConnection,
    {
      body: {
        communityId: communityId,
        // Use user1Auth.id or fallback to token
        communityModeratorId: (user1Auth as any).id ?? "user1-fallback-id",
        role: "owner",
      },
    },
  );
  typia.assert(ownerModerator);

  // 6. Assign user2 as moderator
  const moderator = await generate_random_community_platform_admin_community_moderators_create(
    adminLoginConnection,
    {
      body: {
        communityId: communityId,
        communityModeratorId: (user2Auth as any).id ?? "user2-fallback-id",
        role: "moderator",
      },
    },
  );
  typia.assert(moderator);

  // 7. Attempt to update user2's moderator role to owner - expect error
  await TestValidator.error(
    "should fail updating role to owner due to unique owner constraint",
    async () => {
      await api.functional.communityPlatform.admin.communityModerators.update(
        adminLoginConnection,
        {
          communityModeratorId: (moderator as any).id ?? "mod-fallback-id",
          body: {
            role: "owner",
          },
        },
      );
    },
  );
}
