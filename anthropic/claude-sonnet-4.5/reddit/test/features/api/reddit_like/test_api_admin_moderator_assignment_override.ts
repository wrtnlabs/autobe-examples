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
 * Test admin override capability for moderator assignment.
 *
 * This test validates that platform administrators can assign moderators to any
 * community regardless of their own moderator status in that community. The
 * test verifies the admin override capability where administrators bypass
 * normal permission checks that restrict moderator assignment to users with
 * 'manage_moderators' permission.
 *
 * Workflow:
 *
 * 1. Create admin account for testing administrator privileges
 * 2. Create member account to own the test community
 * 3. Member creates a community (becomes primary moderator)
 * 4. Create moderator account to be assigned
 * 5. Admin assigns moderator to community without being a moderator themselves
 * 6. Validate successful moderator assignment
 *
 * This validates platform-wide administrator authority for community
 * governance.
 */
export async function test_api_admin_moderator_assignment_override(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account who will own the community
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Member creates a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Create moderator account to be assigned
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 5: Switch to admin context and assign moderator to community
  const adminReauth: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(adminReauth);

  const assignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: assignmentData,
      },
    );
  typia.assert(assignment);

  // Step 6: Validate the moderator assignment
  TestValidator.equals(
    "assigned community matches",
    assignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "assigned moderator matches",
    assignment.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "is not primary moderator",
    assignment.is_primary,
    false,
  );
  TestValidator.equals(
    "permissions assigned correctly",
    assignment.permissions,
    assignmentData.permissions,
  );
}
