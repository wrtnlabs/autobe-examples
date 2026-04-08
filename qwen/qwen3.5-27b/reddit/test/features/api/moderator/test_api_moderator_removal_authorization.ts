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
 * Test the authorization rule that only community owners can remove moderators.
 *
 * Validates the permission hierarchy for moderator removal operations within a community. Ensures that only the community owner has the authority to remove other moderators, while regular moderators cannot remove their peers.
 *
 * The test creates two moderator accounts, sets up a moderator assignment in a community, then attempts to remove the moderator from both a non-owner moderator account and the owner account to verify proper authorization enforcement.
 *
 * 1. Register and authenticate as community owner (moderator1)
 * 2. Register and authenticate as second moderator (moderator2)
 * 3. Create a moderator assignment for moderator2 in a community (as owner)
 * 4. Attempt to remove moderator2 as moderator2 (non-owner) - should fail with 403
 * 5. Remove moderator2 as moderator1 (owner) - should succeed without error
 */
export async function test_api_moderator_removal_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner (moderator1)
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
  // 2. Register and authenticate as second moderator (moderator2)
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
  // 3. Create a moderator assignment for moderator2 in a community (as owner)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId,
        },
        body: {
          userProfileId: moderatorAuth.reddit_clone_user_profile_id,
          role: "moderator",
        } satisfies IRedditCloneCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Attempt to remove moderator2 as moderator2 (non-owner) - should fail with 403
  await TestValidator.httpError(
    "non-owner moderator cannot remove other moderators",
    403,
    async () =>
      await api.functional.redditClone.moderator.communities.moderators.erase(
        moderatorConnection,
        {
          communityId,
          moderatorId: moderatorAssignment.id,
        },
      ),
  );
  // 5. Remove moderator2 as moderator1 (owner) - should succeed without error
  await api.functional.redditClone.moderator.communities.moderators.erase(
    ownerConnection,
    {
      communityId,
      moderatorId: moderatorAssignment.id,
    },
  );
}
