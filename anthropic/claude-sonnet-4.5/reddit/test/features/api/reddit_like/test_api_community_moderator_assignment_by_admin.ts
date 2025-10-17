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
 * Test administrator's ability to assign moderators to any community.
 *
 * This test validates that platform administrators can exercise their
 * platform-wide override capabilities to assign moderators to any community
 * regardless of their personal moderator assignments. The test creates a
 * community as a member, then uses an administrator account to assign a
 * moderator to that community with custom permissions, verifying that the
 * administrator can successfully create moderator assignments without needing
 * community-specific moderator status.
 *
 * Workflow steps:
 *
 * 1. Create administrator account with platform-wide privileges
 * 2. Create member account to establish community ownership
 * 3. Create moderator account to be assigned to the community
 * 4. Member creates a community (becomes primary moderator)
 * 5. Administrator assigns moderator to the community with custom permissions
 * 6. Validate moderator assignment creation and permission configuration
 */
export async function test_api_community_moderator_assignment_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create member account to own the community
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 3: Create moderator account to be assigned
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

  // Step 4: Member creates a community
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

  // Step 5: Administrator assigns moderator to the community
  const customPermissions = "manage_posts,manage_comments,access_reports";
  const assignmentData = {
    moderator_id: moderator.id,
    permissions: customPermissions,
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.communities.moderators.create(connection, {
      communityId: community.id,
      body: assignmentData,
    });
  typia.assert(assignment);

  // Step 6: Validate moderator assignment
  TestValidator.equals(
    "assignment community ID matches",
    assignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "assignment moderator ID matches",
    assignment.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "assignment permissions match",
    assignment.permissions,
    customPermissions,
  );
  TestValidator.equals(
    "assignment is not primary moderator",
    assignment.is_primary,
    false,
  );
}
