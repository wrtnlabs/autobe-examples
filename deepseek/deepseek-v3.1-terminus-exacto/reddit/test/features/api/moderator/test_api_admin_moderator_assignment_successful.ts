import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
 * Test successful moderator assignment by an admin user.
 * 1. Authenticate as admin
 * 2. Create a regular user account
 * 3. Create a community with user
 * 4. Assign the user as moderator to the community
 * 5. Validate moderator assignment details
 */
export async function test_api_admin_moderator_assignment_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "1234",
  } satisfies ICommunityPlatformAdmin.ILogin;
  const admin = await authorize_admin_login(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user_password_123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 3. Create community with user authentication
  const communityUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(communityUserConnection, {
    body: {
      email: user.email,
      password: "user_password_123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      communityUserConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign moderator
  const moderator =
    await generate_random_community_platform_admin_communities_moderators_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: user.id,
          role_level: "moderator",
          notes: "Test moderator assignment for community management",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. Validate business logic (not type validation after typia.assert)
  TestValidator.equals(
    "user ID matches in moderator assignment",
    moderator.user.id,
    user.id,
  );
  TestValidator.equals(
    "community ID matches in moderator assignment",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "assigned by user ID matches admin",
    moderator.assigned_by.id,
    admin.id,
  );
  TestValidator.equals(
    "role level is moderator",
    moderator.role_level,
    "moderator",
  );
  TestValidator.predicate(
    "moderator assignment is active",
    moderator.is_active,
  );
  TestValidator.equals(
    "assignment notes match",
    moderator.notes,
    "Test moderator assignment for community management",
  );
}
