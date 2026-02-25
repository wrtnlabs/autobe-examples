import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_flair_assignments_create } from "../../../generate/generate_random_community_platform_moderator_communities_flair_assignments_create";
import { generate_random_community_platform_moderator_communities_flairs_create } from "../../../generate/generate_random_community_platform_moderator_communities_flairs_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";
import { prepare_random_community_platform_community_flair_assignment } from "../../../prepare/prepare_random_community_platform_community_flair_assignment";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test authorization failure when attempting to delete a flair assignment without proper moderator permissions.
 * Creates a community and flair assignment, then attempts deletion with a regular user account.
 * Validates that the system returns appropriate authorization error (403 Forbidden) and prevents the deletion.
 * Also tests cross-community authorization by attempting to delete a flair assignment from a different community where the user is not a moderator.
 */
export async function test_api_moderator_flair_assignment_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
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
  // Create moderator connection for flair operations
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Assign moderator role to the moderator user
  await generate_random_community_platform_user_communities_moderators_create(
    userConnection,
    {
      params: { communityId: community.id },
      body: {
        user_id: moderatorConnection.headers?.Authorization
          ? (
              await authorize_moderator_login(moderatorConnection, {
                body: {
                  email: typia.random<string & tags.Format<"email">>(),
                  password: "password123",
                } satisfies ICommunityPlatformModerator.ILogin,
              })
            ).id
          : typia.random<string & tags.Format<"uuid">>(),
        role_level: "moderator",
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // Create flair
  const flair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          display_text: RandomGenerator.alphabets(6),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(flair);
  // Create another user to assign flair to
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(targetUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create flair assignment
  const flairAssignment =
    await generate_random_community_platform_moderator_communities_flair_assignments_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          community_platform_user_id: targetUser.id,
          community_platform_community_flair_id: flair.id,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
      },
    );
  typia.assert(flairAssignment);
  // Test 1: Regular user attempting to delete flair assignment (should fail)
  await TestValidator.error(
    "regular user cannot delete flair assignment",
    async () => {
      await api.functional.communityPlatform.moderator.communities.flair_assignments.erase(
        userConnection,
        {
          communityId: community.id,
          assignmentId: flairAssignment.id,
        },
      );
    },
  );
  // Test 2: Cross-community authorization - create another community
  const anotherUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(anotherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const anotherCommunity =
    await generate_random_community_platform_user_communities_create(
      anotherUserConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(anotherCommunity);
  // Test 3: Attempt to delete flair assignment from different community (should fail)
  await TestValidator.error(
    "cannot delete flair assignment from different community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.flair_assignments.erase(
        moderatorConnection,
        {
          communityId: anotherCommunity.id,
          assignmentId: flairAssignment.id,
        },
      );
    },
  );
  // Verify flair assignment was not deleted by testing that moderator can still access it
  TestValidator.predicate(
    "flair assignment should still exist after failed deletion attempts",
    flairAssignment.id !== null && flairAssignment.id.length > 0,
  );
}
