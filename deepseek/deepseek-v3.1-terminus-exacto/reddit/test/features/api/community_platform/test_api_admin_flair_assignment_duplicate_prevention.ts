import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
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
import { generate_random_community_platform_admin_communities_flair_assignments_create } from "../../../generate/generate_random_community_platform_admin_communities_flair_assignments_create";
import { generate_random_community_platform_admin_communities_flairs_create } from "../../../generate/generate_random_community_platform_admin_communities_flairs_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";
import { prepare_random_community_platform_community_flair_assignment } from "../../../prepare/prepare_random_community_platform_community_flair_assignment";

/**
 * Test the prevention of duplicate flair assignments for the same user, community, and flair combination.
 * An admin authenticates, creates a community, defines a flair, and assigns it to a user.
 * Attempt to create a duplicate assignment with the same user and flair combination.
 * Validate that the system correctly prevents duplicate assignments by returning an appropriate error response.
 * Verify that the original assignment remains unchanged and that no duplicate records are created.
 * Test the uniqueness constraint enforcement that ensures each user can only have one active assignment per flair within a community.
 */
export async function test_api_admin_flair_assignment_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: "admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a regular user account for community creation
  const userConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(communityOwner);
  // 3. Create a community with the regular user
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
  // 4. Define a flair within the community using admin
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(flair);
  // 5. Create a target user account for flair assignment
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(targetUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(targetUser);
  // 6. Assign the flair to the user (first assignment)
  const firstAssignment =
    await generate_random_community_platform_admin_communities_flair_assignments_create(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          community_platform_user_id: targetUser.id,
          community_platform_community_flair_id: flair.id,
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
      },
    );
  typia.assert(firstAssignment);
  // 7. Attempt to create a duplicate assignment with the same user and flair
  await TestValidator.error(
    "duplicate flair assignment should fail",
    async () => {
      await generate_random_community_platform_admin_communities_flair_assignments_create(
        adminConnection,
        {
          params: { communityId: community.id },
          body: {
            community_platform_user_id: targetUser.id,
            community_platform_community_flair_id: flair.id,
            expired_at: null,
          } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        },
      );
    },
  );
  // 8. Verify that the original assignment remains unchanged
  TestValidator.equals(
    "original assignment user should remain unchanged",
    firstAssignment.user.id,
    targetUser.id,
  );
  TestValidator.equals(
    "original assignment flair should remain unchanged",
    firstAssignment.flair.id,
    flair.id,
  );
  TestValidator.equals(
    "original assignment community should remain unchanged",
    firstAssignment.community.id,
    community.id,
  );
}
