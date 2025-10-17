import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test community deletion by primary moderator.
 *
 * This test validates the complete workflow where a primary moderator
 * (community creator) soft-deletes their own community. The test ensures that:
 *
 * 1. A moderator can successfully register and authenticate
 * 2. The authenticated moderator can create a new community
 * 3. The primary moderator (creator) has permission to delete the community
 * 4. The soft-delete operation completes successfully
 *
 * This workflow validates the authorization model where only primary moderators
 * can delete communities they created, implementing the soft-delete pattern
 * with a 30-day recovery period as specified in the requirements.
 */
export async function test_api_community_deletion_by_primary_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community with the moderator as primary creator
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Validate that community was created successfully
  TestValidator.equals(
    "community code matches",
    community.code,
    communityData.code,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityData.description,
  );

  // Step 3: Primary moderator deletes the community (soft-delete)
  await api.functional.redditLike.moderator.communities.erase(connection, {
    communityId: community.id,
  });

  // The deletion should complete successfully without throwing errors
  // The community is now soft-deleted with deleted_at timestamp set
}
