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
 * Test retrieving a specific moderator assignment within a community.
 *
 * Validates the complete moderator assignment retrieval workflow including moderator authentication, assignment creation, and detailed entity retrieval. Ensures that the retrieved moderator assignment contains all required fields with correct types and nested objects.
 *
 * Special attention is given to verifying that the moderator assignment entity includes complete user profile and community information, and that the IDs match the request parameters.
 *
 * 1. Register and authenticate as a moderator using the join endpoint.
 * 2. Create a moderator assignment in a community with a specific role.
 * 3. Retrieve the created moderator assignment using the GET endpoint.
 * 4. Validate response structure, nested objects, and ID consistency.
 */
export async function test_api_moderator_retrieve_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create a moderator assignment in a community
  // Need to generate a community ID first (using random UUID for testing)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          userProfileId: moderatorAuth.reddit_clone_user_profile_id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 3. Retrieve the created moderator assignment
  const retrievedAssignment =
    await api.functional.redditClone.moderator.communities.moderators.at(
      moderatorConnection,
      {
        communityId: communityId,
        moderatorId: moderatorAssignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // 4. Validate response structure and content
  TestValidator.equals(
    "moderatorId matches request",
    retrievedAssignment.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "communityId matches request",
    retrievedAssignment.community.id,
    communityId,
  );
  TestValidator.predicate(
    "role is valid",
    ["owner", "moderator"].includes(retrievedAssignment.role),
  );
  TestValidator.equals(
    "deleted_at is null for active assignment",
    retrievedAssignment.deleted_at,
    null,
  );
  TestValidator.equals(
    "userProfile id matches",
    retrievedAssignment.userProfile.id,
    moderatorAuth.reddit_clone_user_profile_id,
  );
  TestValidator.predicate(
    "userProfile has display_name",
    retrievedAssignment.userProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "community has name",
    retrievedAssignment.community.name.length > 0,
  );
  TestValidator.predicate(
    "community has owner",
    retrievedAssignment.community.owner.id.length > 0,
  );
}
