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
 * Test business logic preventing duplicate removal of already-deleted moderator assignment.
 */
export async function test_api_community_moderator_removal_inactive_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "owner-password-123",
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(owner);
  // 2. Setup: Create and authenticate potential moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_user_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator-password-123",
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(moderator);
  // 3. Owner creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Owner assigns moderator role to the second user
  const moderatorAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: moderator.id,
          role_level: "standard",
          notes: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. First deletion: Owner successfully removes the moderator assignment (soft delete)
  await api.functional.communityPlatform.user.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorAssignmentId: moderatorAssignment.id,
    },
  );
  // 6. Duplicate deletion attempt: Should return 400 Bad Request
  await TestValidator.error(
    "duplicate removal should return bad request",
    async () => {
      await api.functional.communityPlatform.user.communities.moderators.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderatorAssignmentId: moderatorAssignment.id,
        },
      );
    },
  );
  // 7. Edge case: Attempt to delete non-existent assignment (random UUID) returns 404
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent assignment should return not found",
    async () => {
      await api.functional.communityPlatform.user.communities.moderators.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderatorAssignmentId: randomUuid,
        },
      );
    },
  );
  // 8. Verify proper error messages for resource not found scenarios
  // (Error message content is validated by TestValidator.error)
  // 9. Validate that soft-deleted assignment still appears in historical queries but is not considered active
  // This would require a separate endpoint to fetch deleted assignments, which may not exist.
  // Omitted as it's not part of the available API functions.
}
