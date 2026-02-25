import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test authorization failure when non-owner attempts to remove moderator assignment.
 * Authenticate three users: user A (community owner), user B (moderator to be removed), user C (unauthorized user).
 * User A creates community and assigns user B as moderator.
 * Then user C attempts to delete the moderator assignment.
 * Expected: 403 Forbidden error.
 */
export async function test_api_community_moderator_removal_unauthorized_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner (User A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate user to be assigned as moderator (User B)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_user_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Assign moderator role to User B
  const moderatorAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      ownerConnection,
      {
        body: {
          user_id: moderatorAuth.id,
          role_level: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create and authenticate unauthorized third user (User C)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_user_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(unauthorizedAuth);
  // 6. Attempt to remove moderator assignment with unauthorized user (should fail)
  await TestValidator.httpError(
    "unauthorized user cannot remove moderator assignment",
    403,
    async () => {
      await api.functional.communityPlatform.user.communities.moderators.erase(
        unauthorizedConnection,
        {
          communityId: community.id,
          moderatorAssignmentId: moderatorAssignment.id,
        },
      );
    },
  );
  // 7. Verify moderator assignment still exists by attempting to remove it with owner (should succeed)
  await api.functional.communityPlatform.user.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorAssignmentId: moderatorAssignment.id,
    },
  );
}
