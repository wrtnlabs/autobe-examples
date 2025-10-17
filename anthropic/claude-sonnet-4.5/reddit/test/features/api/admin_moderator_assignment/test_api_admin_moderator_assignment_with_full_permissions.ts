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
 * Test administrator assigning moderator with comprehensive permission set.
 *
 * This test validates that administrators have the authority to assign
 * moderators to communities with full permission grants including all available
 * permissions: manage_posts, manage_comments, manage_users, manage_settings,
 * manage_moderators, and access_reports.
 *
 * The test workflow:
 *
 * 1. Create a member account and community
 * 2. Create a moderator account to be assigned
 * 3. Create an administrator account
 * 4. Administrator assigns the moderator with full permissions to the community
 * 5. Verify all permissions were correctly granted in the assignment record
 */
export async function test_api_admin_moderator_assignment_with_full_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create member account and community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

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

  // Step 2: Create moderator account to be assigned
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create admin account (this sets admin authentication context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 4: Admin assigns moderator with full permissions
  const fullPermissions =
    "manage_posts,manage_comments,manage_users,manage_settings,manage_moderators,access_reports";

  const assignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.admin.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: fullPermissions,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);

  // Step 5: Verify all permissions were correctly granted
  TestValidator.equals(
    "assigned moderator ID matches",
    assignment.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "assigned community ID matches",
    assignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "all permissions granted",
    assignment.permissions,
    fullPermissions,
  );
  TestValidator.predicate("assignment has valid ID", assignment.id.length > 0);
  TestValidator.predicate(
    "assignment timestamp exists",
    assignment.assigned_at.length > 0,
  );
}
