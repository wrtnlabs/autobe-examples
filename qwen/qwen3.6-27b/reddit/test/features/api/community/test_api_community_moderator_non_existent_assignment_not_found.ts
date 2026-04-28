import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test 404 Not Found when querying a non-existent community moderator assignment.
 *
 * Validates that the GET endpoint for retrieving community moderator details returns a 404 error when the requested communityModeratorId does not exist in the database. This ensures the API properly handles missing resources without exposing internal errors.
 *
 * 1. Authenticate a member who will act as the community creator.
 * 2. Create a new community for testing context.
 * 3. Register a second member to be assigned as a moderator.
 * 4. Assign the second member as a moderator to the created community.
 * 5. Generate a fabricated UUID that does not correspond to any existing moderator assignment.
 * 6. Call the moderator retrieval endpoint with the valid community ID but the fabricated moderator ID.
 * 7. Assert that the endpoint returns a 404 Not Found HttpError.
 */
export async function test_api_community_moderator_non_existent_assignment_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(owner);
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Register a second member to serve as the moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(moderatorMember);
  // 4. Assign the second member as a moderator to the community
  //    Owner uses their connection to assign the moderator
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorMember.id,
          community_id: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Generate a fabricated UUID that does not exist in the database
  const fabricatedModeratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6 & 7. Call GET with valid communityId but fabricated communityModeratorId
  //    and validate 404 Not Found is returned
  await TestValidator.httpError(
    "non-existent moderator assignment returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.communities.community_moderators.at(
        connection,
        {
          communityId: community.id,
          communityModeratorId: fabricatedModeratorId,
        },
      );
    },
  );
}
