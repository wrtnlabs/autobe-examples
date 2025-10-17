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
 * Test seniority-based moderator permission updates.
 *
 * This test validates that a senior moderator with 'manage_moderators'
 * permission can successfully update permissions for junior moderators who were
 * assigned after them.
 *
 * Workflow:
 *
 * 1. Create primary moderator account and community
 * 2. Create two member accounts for promotion to moderators
 * 3. Assign first member as senior moderator with 'manage_moderators' permission
 * 4. Assign second member as junior moderator with basic permissions
 * 5. Update junior moderator's permissions as primary moderator
 * 6. Validate successful permission update
 */
export async function test_api_moderator_permission_update_with_seniority_rules(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account
  const primaryModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(primaryModerator);

  // Step 2: Create community (primary moderator becomes community creator)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
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
    },
  );
  typia.assert(community);

  // Step 3: Create first member account (will be senior moderator)
  const seniorMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(seniorMember);

  // Step 4: Create second member account (will be junior moderator)
  const juniorMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(juniorMember);

  // Step 5: Switch back to primary moderator context and assign senior moderator
  await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });

  const seniorModeratorAssignment =
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

  // Step 6: Assign junior moderator with basic permissions
  const juniorModeratorAssignment =
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

  // Step 7: Update junior moderator's permissions
  const updatedModeratorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: juniorModeratorAssignment.id,
        body: {
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModeratorAssignment);

  // Step 8: Validate the permission update
  TestValidator.equals(
    "junior moderator permissions updated successfully",
    updatedModeratorAssignment.permissions,
    "manage_posts,manage_comments,access_reports",
  );
  TestValidator.equals(
    "moderator assignment ID matches",
    updatedModeratorAssignment.id,
    juniorModeratorAssignment.id,
  );
}
