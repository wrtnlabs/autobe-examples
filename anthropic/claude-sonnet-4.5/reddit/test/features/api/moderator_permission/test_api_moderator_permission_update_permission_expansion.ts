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
 * Test expanding a moderator's permission set from basic to comprehensive
 * permissions.
 *
 * This test validates the complete workflow of moderator permission expansion:
 *
 * 1. Creates a member account to be assigned as moderator
 * 2. Creates a primary moderator account with full permissions
 * 3. Primary moderator creates a community
 * 4. Assigns member as moderator with limited 'manage_posts' permission
 * 5. Updates moderator permissions to include additional capabilities
 * 6. Validates successful permission expansion
 */
export async function test_api_moderator_permission_update_permission_expansion(
  connection: api.IConnection,
) {
  // Step 1: Create member account to be assigned as moderator
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

  // Step 2: Create primary moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const primaryModerator: IRedditLikeModerator.IAuthorized =
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
  typia.assert(primaryModerator);

  // Step 3: Primary moderator creates community
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

  // Step 4: Assign member as moderator with limited permission (only 'manage_posts')
  const initialPermissions = "manage_posts";
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: member.id,
          permissions: initialPermissions,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Validate initial assignment has limited permissions
  TestValidator.equals(
    "initial permissions should be manage_posts only",
    moderatorAssignment.permissions,
    initialPermissions,
  );
  TestValidator.equals(
    "moderator should be assigned to correct community",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator should be assigned correct user",
    moderatorAssignment.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "moderator should not be primary",
    moderatorAssignment.is_primary,
    false,
  );

  // Step 5: Update moderator permissions to expanded set
  const expandedPermissions = "manage_posts,manage_comments,manage_users";
  const updatedModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
        body: {
          permissions: expandedPermissions,
        } satisfies IRedditLikeCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);

  // Step 6: Validate permission expansion succeeded
  TestValidator.equals(
    "updated permissions should include all three capabilities",
    updatedModerator.permissions,
    expandedPermissions,
  );
  TestValidator.equals(
    "moderator assignment ID should remain unchanged",
    updatedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedModerator.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator user ID should remain unchanged",
    updatedModerator.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "is_primary status should remain unchanged",
    updatedModerator.is_primary,
    false,
  );
  TestValidator.predicate(
    "permissions should contain manage_posts",
    updatedModerator.permissions.includes("manage_posts"),
  );
  TestValidator.predicate(
    "permissions should contain manage_comments",
    updatedModerator.permissions.includes("manage_comments"),
  );
  TestValidator.predicate(
    "permissions should contain manage_users",
    updatedModerator.permissions.includes("manage_users"),
  );
}
