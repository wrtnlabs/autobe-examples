import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator assignment seniority tracking through timestamps.
 *
 * This test validates that the moderator assignment system correctly tracks
 * seniority information through assigned_at timestamps. The seniority tracking
 * is essential for enforcing permission hierarchies where moderators can only
 * remove moderators who were assigned after them.
 *
 * The test creates multiple moderator assignments and validates:
 *
 * 1. Member creates community and becomes primary moderator
 * 2. Primary moderator assigns first moderator
 * 3. Primary moderator assigns second moderator
 * 4. Validates timestamps establish proper chronological order
 * 5. Validates assignment records contain correct metadata
 *
 * Note: Due to API limitations (only join endpoints, no login), we cannot
 * switch between user sessions to have the first moderator assign the second.
 * Instead, the primary moderator assigns both, which still validates timestamp
 * tracking.
 */
export async function test_api_moderator_assignment_seniority_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create member account that will create the community
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Member creates community (becomes primary moderator automatically)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create first moderator account
  const firstModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(firstModerator);

  // Step 5: Create second moderator account
  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(secondModerator);

  // Step 6: Assign first moderator (as currently authenticated moderator)
  const firstAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: firstModerator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAssignment);

  // Capture first assignment timestamp for seniority comparison
  const firstAssignmentTime = new Date(firstAssignment.assigned_at);

  // Step 7: Assign second moderator after a brief moment
  const secondAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: secondModerator.id,
          permissions: "manage_posts,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(secondAssignment);

  // Capture second assignment timestamp for seniority comparison
  const secondAssignmentTime = new Date(secondAssignment.assigned_at);

  // Validate assignment timestamps are valid
  TestValidator.predicate(
    "first assignment has valid timestamp",
    !isNaN(firstAssignmentTime.getTime()),
  );
  TestValidator.predicate(
    "second assignment has valid timestamp",
    !isNaN(secondAssignmentTime.getTime()),
  );

  // Validate chronological seniority order
  TestValidator.predicate(
    "first moderator assigned before or at same time as second moderator",
    firstAssignmentTime.getTime() <= secondAssignmentTime.getTime(),
  );

  // Verify assignment records contain correct moderator IDs
  TestValidator.equals(
    "first assignment moderator ID matches",
    firstAssignment.moderator_id,
    firstModerator.id,
  );
  TestValidator.equals(
    "second assignment moderator ID matches",
    secondAssignment.moderator_id,
    secondModerator.id,
  );

  // Verify assignment records contain community ID
  TestValidator.equals(
    "first assignment community ID matches",
    firstAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "second assignment community ID matches",
    secondAssignment.community_id,
    community.id,
  );

  // Verify primary moderator status (assigned moderators are not primary)
  TestValidator.equals(
    "first moderator is not primary",
    firstAssignment.is_primary,
    false,
  );
  TestValidator.equals(
    "second moderator is not primary",
    secondAssignment.is_primary,
    false,
  );

  // Verify permissions were assigned correctly
  TestValidator.equals(
    "first moderator permissions match",
    firstAssignment.permissions,
    "manage_posts,manage_comments,access_reports",
  );
  TestValidator.equals(
    "second moderator permissions match",
    secondAssignment.permissions,
    "manage_posts,access_reports",
  );

  // Verify both assignments have unique IDs
  TestValidator.notEquals(
    "assignment IDs are unique",
    firstAssignment.id,
    secondAssignment.id,
  );
}
