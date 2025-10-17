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
 * Test moderator seniority tracking and hierarchy system.
 *
 * This test validates that the moderator assignment system correctly tracks
 * assignment timestamps (assigned_at) and maintains proper hierarchy records.
 * It creates multiple moderator assignments sequentially with time gaps, then
 * retrieves each assignment to verify their assigned_at timestamps reflect the
 * correct assignment order for seniority-based permission rules.
 *
 * Steps:
 *
 * 1. Create first moderator account who will make assignments
 * 2. Create second moderator account to be assigned
 * 3. Create member account for community creation
 * 4. Member creates community (becomes primary moderator)
 * 5. Switch to first moderator and assign them to community
 * 6. Retrieve and verify first moderator assignment details
 * 7. Create third moderator account
 * 8. Assign third moderator to community (establishing seniority order)
 * 9. Retrieve and verify second moderator assignment details
 * 10. Validate chronological order of assignments
 */
export async function test_api_moderator_hierarchy_and_seniority_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const firstModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(firstModerator);

  // Store first moderator ID before context switch
  const firstModeratorId = firstModerator.id;

  // Step 2: Create second moderator account to be assigned
  const secondModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(secondModerator);

  const secondModeratorId = secondModerator.id;

  // Step 3: Create member account for community creation
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Member creates community
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 5: Assign first moderator to community
  const firstModeratorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: firstModeratorId,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(firstModeratorAssignment);

  // Step 6: Retrieve and verify first moderator assignment
  const retrievedFirstAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.at(
      connection,
      {
        communityId: community.id,
        moderatorId: firstModeratorAssignment.id,
      },
    );
  typia.assert(retrievedFirstAssignment);

  TestValidator.equals(
    "first assignment ID matches",
    retrievedFirstAssignment.id,
    firstModeratorAssignment.id,
  );
  TestValidator.equals(
    "first assignment community ID matches",
    retrievedFirstAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "first assignment moderator ID matches",
    retrievedFirstAssignment.moderator_id,
    firstModeratorId,
  );

  // Wait to ensure different timestamps for seniority tracking
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Assign second moderator to community
  const secondModeratorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: secondModeratorId,
          permissions: "manage_posts,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAssignment);

  // Step 8: Retrieve and verify second moderator assignment
  const retrievedSecondAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.at(
      connection,
      {
        communityId: community.id,
        moderatorId: secondModeratorAssignment.id,
      },
    );
  typia.assert(retrievedSecondAssignment);

  TestValidator.equals(
    "second assignment ID matches",
    retrievedSecondAssignment.id,
    secondModeratorAssignment.id,
  );
  TestValidator.equals(
    "second assignment community ID matches",
    retrievedSecondAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "second assignment moderator ID matches",
    retrievedSecondAssignment.moderator_id,
    secondModeratorId,
  );

  // Step 9: Validate chronological order (seniority tracking)
  const firstAssignedAt = new Date(retrievedFirstAssignment.assigned_at);
  const secondAssignedAt = new Date(retrievedSecondAssignment.assigned_at);

  TestValidator.predicate(
    "first moderator assigned before second moderator",
    firstAssignedAt.getTime() < secondAssignedAt.getTime(),
  );

  // Verify permissions are correctly stored
  TestValidator.predicate(
    "first moderator has correct permissions",
    retrievedFirstAssignment.permissions.includes("manage_posts"),
  );
  TestValidator.predicate(
    "second moderator has correct permissions",
    retrievedSecondAssignment.permissions.includes("access_reports"),
  );
}
