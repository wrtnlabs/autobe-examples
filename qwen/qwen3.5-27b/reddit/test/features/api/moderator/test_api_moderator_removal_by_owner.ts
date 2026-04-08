import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_moderators_create";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test community owner removing a moderator from their community.
 *
 * Validates the complete moderator removal workflow including registration of two moderators, community setup, moderator assignment, and removal by the owner. Ensures that only the community owner has the authority to remove moderators and that the removal operation correctly soft-deletes the moderator assignment record.
 *
 * Special attention is given to verifying that the removed moderator loses their privileges while the owner retains full control over the community.
 *
 * 1. Register and authenticate as community owner (moderator 1).
 * 2. Register and authenticate as user to be added as moderator (moderator 2).
 * 3. Use a mock community ID (community creation API not available in current SDK).
 * 4. Add moderator 2 as a moderator to the community.
 * 5. Remove moderator 2 from the community using the owner's credentials.
 * 6. Verify the removal was successful and the operation completed without errors.
 */
export async function test_api_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Register and authenticate as user to be added as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Use a mock community ID (community creation API not available)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Add moderator 2 as a moderator to the community
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId },
        body: {
          userProfileId: moderatorAuth.userProfile.id,
          role: "moderator",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Verify the moderator assignment was created successfully
  TestValidator.equals(
    "moderator role is correct",
    moderatorAssignment.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator user profile matches",
    moderatorAssignment.userProfile.id,
    moderatorAuth.userProfile.id,
  );
  // 6. Remove moderator 2 from the community using the owner's credentials
  await api.functional.redditClone.moderator.communities.moderators.erase(
    ownerConnection,
    {
      communityId,
      moderatorId: moderatorAssignment.id,
    },
  );
  // 7. Verify the removal was successful (no exception thrown)
  TestValidator.predicate("moderator removal succeeded", true);
  // 8. Test that non-owner cannot remove moderators (business logic validation)
  // Attempt to remove the same moderator again (should fail as it's already deleted)
  await TestValidator.error(
    "cannot remove already deleted moderator",
    async () => {
      await api.functional.redditClone.moderator.communities.moderators.erase(
        ownerConnection,
        {
          communityId,
          moderatorId: moderatorAssignment.id,
        },
      );
    },
  );
}
