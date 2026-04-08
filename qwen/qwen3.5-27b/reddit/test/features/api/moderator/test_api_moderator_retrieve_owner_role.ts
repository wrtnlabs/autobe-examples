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
 * Test retrieving a moderator assignment with owner role.
 *
 * Validates the complete flow of creating an owner role moderator assignment and retrieving its details. Ensures that the owner role is correctly assigned and that all nested data structures are properly populated.
 *
 * Special attention is given to verifying that the owner role indicates highest authority in the community and that the assignment is active (deleted_at is null).
 *
 * 1. Register and authenticate as a moderator using the join endpoint.
 * 2. Create a moderator assignment with role='owner' in a community.
 * 3. Retrieve the owner moderator assignment using the GET endpoint.
 * 4. Validate that the role is 'owner' and all nested data is properly populated.
 */
export async function test_api_moderator_retrieve_owner_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Create a moderator assignment with role='owner'
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const ownerAssignment =
    await generate_random_reddit_clone_moderator_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          role: "owner",
        },
      },
    );
  typia.assert(ownerAssignment);
  // 3. Retrieve the owner moderator assignment
  const retrievedAssignment =
    await api.functional.redditClone.moderator.communities.moderators.at(
      moderatorConnection,
      {
        communityId,
        moderatorId: ownerAssignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // 4. Validate the retrieved assignment
  TestValidator.equals("role is owner", retrievedAssignment.role, "owner");
  TestValidator.predicate("userProfile is populated", () =>
    typia.is<IRedditCloneUserProfile.ISummary>(retrievedAssignment.userProfile),
  );
  TestValidator.predicate("community is populated", () =>
    typia.is<IRedditCloneCommunity.ISummary>(retrievedAssignment.community),
  );
  TestValidator.predicate("created_at is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedAssignment.created_at,
    ),
  );
  TestValidator.predicate("updated_at is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedAssignment.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    retrievedAssignment.deleted_at,
    null,
  );
}
