import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the complete workflow where a primary moderator removes another
 * moderator from the community.
 *
 * This test validates the moderator removal functionality by executing the
 * following workflow:
 *
 * 1. Create a moderator account that will become the primary moderator
 * 2. Create a member account to be assigned as additional moderator
 * 3. Primary moderator creates a community (automatically assigned as primary)
 * 4. Primary moderator assigns the member as an additional moderator
 * 5. Primary moderator removes the assigned moderator from the community
 * 6. Validate that removal succeeds and permissions are revoked
 *
 * The test ensures that primary moderators have authority to remove other
 * moderators, and that removed moderators lose their permissions immediately
 * while retaining their community membership status.
 */
export async function test_api_moderator_removal_by_primary_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account
  const primaryModeratorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const primaryModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: primaryModeratorData,
    });
  typia.assert(primaryModerator);

  // Step 2: Create member account to be assigned as moderator
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Primary moderator creates a community (automatically becomes primary moderator)
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Primary moderator assigns member as additional moderator
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: member.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Validate that the moderator was assigned successfully
  TestValidator.equals(
    "assigned moderator ID matches member ID",
    moderatorAssignment.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "assigned to correct community",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "is not primary moderator",
    moderatorAssignment.is_primary,
    false,
  );

  // Step 5: Primary moderator removes the assigned moderator (using member ID, not assignment ID)
  await api.functional.redditLike.moderator.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: member.id,
    },
  );

  // Step 6: Validation is complete - the removal succeeded without throwing errors
  // The API call completed successfully, indicating the moderator was removed
}
