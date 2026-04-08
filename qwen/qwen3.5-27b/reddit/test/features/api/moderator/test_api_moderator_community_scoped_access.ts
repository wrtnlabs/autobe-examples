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
 * Test community-scoped access for moderator assignments.
 *
 * Validates that moderator assignments are properly scoped to their communities and that a moderator can only retrieve assignments within their assigned communities. Tests the business rule that returns 404 Not Found if the moderatorId belongs to a different community than communityId.
 *
 * Moderator roles are community-scoped, meaning a user can have different moderator privileges in different communities. The endpoint correctly enforces community-level access boundaries.
 *
 * 1. Register and authenticate as a moderator using the join endpoint.
 * 2. Create a moderator assignment in Community A with a specific moderatorId.
 * 3. Retrieve the moderator assignment using Community A's ID and the moderatorId (should succeed).
 * 4. Attempt to retrieve the same moderatorId using a different Community B's ID (should return 404).
 */
export async function test_api_moderator_community_scoped_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create a moderator assignment in Community A
  const communityAId = typia.random<string & tags.Format<"uuid">>();
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: {
          communityId: communityAId,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 3. Retrieve the moderator assignment using Community A's ID (should succeed)
  const retrievedAssignment =
    await api.functional.redditClone.moderator.communities.moderators.at(
      moderatorConnection,
      {
        communityId: communityAId,
        moderatorId: moderatorAssignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // Validate that the retrieved assignment matches the created one
  TestValidator.equals(
    "retrieved assignment matches created",
    retrievedAssignment.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "retrieved assignment community matches",
    retrievedAssignment.community.id,
    communityAId,
  );
  // 4. Attempt to retrieve the same moderatorId using a different Community B's ID (should return 404)
  const communityBId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for mismatched communityId",
    404,
    async () =>
      await api.functional.redditClone.moderator.communities.moderators.at(
        moderatorConnection,
        {
          communityId: communityBId,
          moderatorId: moderatorAssignment.id,
        },
      ),
  );
}
