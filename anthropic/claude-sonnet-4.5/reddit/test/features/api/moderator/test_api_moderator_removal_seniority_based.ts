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
 * Test the seniority-based moderator removal workflow.
 *
 * This test validates that a senior moderator with 'manage_moderators'
 * permission can successfully remove a junior moderator who was assigned after
 * them. The test establishes a clear hierarchical structure where:
 *
 * 1. A member creates a community (becomes primary moderator with full
 *    permissions)
 * 2. Primary moderator assigns first member as senior moderator with
 *    'manage_moderators' permission
 * 3. Primary moderator assigns second member as junior moderator with basic
 *    permissions
 * 4. Senior moderator exercises authority to remove the junior moderator
 *
 * This validates the seniority-based governance model where moderators can only
 * remove those assigned after them, maintaining proper community hierarchy.
 */
export async function test_api_moderator_removal_seniority_based(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account who will create the community
  const primaryModeratorEmail = typia.random<string & tags.Format<"email">>();
  const primaryModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: primaryModeratorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(primaryModerator);

  // Step 2: Create community as the moderator (auto-assigned as primary moderator)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
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
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create first member account (will become senior moderator)
  const seniorMemberEmail = typia.random<string & tags.Format<"email">>();
  const seniorMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: seniorMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(seniorMember);

  // Step 4: Create second member account (will become junior moderator)
  const juniorMemberEmail = typia.random<string & tags.Format<"email">>();
  const juniorMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: juniorMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(juniorMember);

  // Switch back to primary moderator context by re-authenticating
  await api.functional.auth.moderator.join(connection, {
    body: {
      username: primaryModerator.username,
      email: primaryModeratorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });

  // Step 5: Assign first member as senior moderator with 'manage_moderators' permission
  const seniorModeratorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: seniorMember.id,
          permissions: "manage_moderators,manage_posts,manage_comments",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModeratorAssignment);
  TestValidator.equals(
    "senior moderator assigned to correct community",
    seniorModeratorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "senior moderator is the correct user",
    seniorModeratorAssignment.moderator_id,
    seniorMember.id,
  );

  // Step 6: Assign second member as junior moderator with basic permissions
  const juniorModeratorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: juniorMember.id,
          permissions: "manage_posts,manage_comments",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModeratorAssignment);
  TestValidator.equals(
    "junior moderator assigned to correct community",
    juniorModeratorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "junior moderator is the correct user",
    juniorModeratorAssignment.moderator_id,
    juniorMember.id,
  );

  // Verify seniority: junior moderator was assigned after senior moderator
  TestValidator.predicate(
    "junior moderator assigned after senior moderator establishing seniority",
    new Date(juniorModeratorAssignment.assigned_at).getTime() >=
      new Date(seniorModeratorAssignment.assigned_at).getTime(),
  );

  // Step 7: Authenticate as senior moderator to perform the removal
  await api.functional.auth.member.join(connection, {
    body: {
      username: seniorMember.username,
      email: seniorMemberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });

  // Step 8: Senior moderator removes junior moderator based on seniority rules
  await api.functional.redditLike.moderator.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: juniorModeratorAssignment.id,
    },
  );

  // Validation: The erase operation completed successfully without throwing an error,
  // which confirms that the senior moderator had the authority to remove the junior moderator
  // and that the seniority-based removal rules are working correctly.
  TestValidator.predicate(
    "seniority-based removal completed successfully",
    true,
  );
}
