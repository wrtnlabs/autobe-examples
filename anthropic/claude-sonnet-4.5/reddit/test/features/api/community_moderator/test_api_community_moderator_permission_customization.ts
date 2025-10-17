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
 * Test granular permission control for community moderator assignments.
 *
 * This test validates that the moderator permission system correctly handles
 * custom permission sets and applies defaults appropriately. It creates
 * multiple moderator assignments with different permission combinations to
 * ensure the system can differentiate between various moderator capabilities.
 *
 * Test workflow:
 *
 * 1. Create primary moderator account with manage_moderators permission
 * 2. Create member account for community creation
 * 3. Create test community (member becomes primary moderator)
 * 4. Create additional moderator accounts for assignment testing
 * 5. Assign moderators with custom permission sets (manage_posts only,
 *    manage_comments + access_reports)
 * 6. Assign moderator without specifying permissions to verify default application
 * 7. Validate all assignments have correct permission configurations
 */
export async function test_api_community_moderator_permission_customization(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account
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

  // Step 2: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
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
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create test community (member becomes primary moderator with all permissions)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Create additional moderator accounts for permission testing
  const moderator1: IRedditLikeModerator.IAuthorized =
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
  typia.assert(moderator1);

  const moderator2: IRedditLikeModerator.IAuthorized =
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
  typia.assert(moderator2);

  const moderator3: IRedditLikeModerator.IAuthorized =
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
  typia.assert(moderator3);

  // Step 5: Assign moderator with only manage_posts permission
  // (member is already authenticated as community creator with manage_moderators permission)
  const assignment1: IRedditLikeCommunityModerator =
    await api.functional.redditLike.communities.moderators.create(connection, {
      communityId: community.id,
      body: {
        moderator_id: moderator1.id,
        permissions: "manage_posts",
      } satisfies IRedditLikeCommunityModerator.ICreate,
    });
  typia.assert(assignment1);

  // Step 6: Assign moderator with manage_comments and access_reports permissions
  const assignment2: IRedditLikeCommunityModerator =
    await api.functional.redditLike.communities.moderators.create(connection, {
      communityId: community.id,
      body: {
        moderator_id: moderator2.id,
        permissions: "manage_comments,access_reports",
      } satisfies IRedditLikeCommunityModerator.ICreate,
    });
  typia.assert(assignment2);

  // Step 7: Assign moderator without specifying permissions (should get defaults)
  const assignment3: IRedditLikeCommunityModerator =
    await api.functional.redditLike.communities.moderators.create(connection, {
      communityId: community.id,
      body: {
        moderator_id: moderator3.id,
      } satisfies IRedditLikeCommunityModerator.ICreate,
    });
  typia.assert(assignment3);

  // Validate permission assignments
  TestValidator.equals(
    "assignment 1 has only manage_posts permission",
    assignment1.permissions,
    "manage_posts",
  );

  TestValidator.equals(
    "assignment 2 has manage_comments and access_reports permissions",
    assignment2.permissions,
    "manage_comments,access_reports",
  );

  // Validate default permissions (manage_posts, manage_comments, access_reports)
  const defaultPermissions = assignment3.permissions
    .split(",")
    .map((p) => p.trim());
  TestValidator.predicate(
    "assignment 3 has all default permissions",
    defaultPermissions.includes("manage_posts") &&
      defaultPermissions.includes("manage_comments") &&
      defaultPermissions.includes("access_reports"),
  );

  // Validate all assignments are for the correct community
  TestValidator.equals(
    "assignment 1 is for correct community",
    assignment1.community_id,
    community.id,
  );

  TestValidator.equals(
    "assignment 2 is for correct community",
    assignment2.community_id,
    community.id,
  );

  TestValidator.equals(
    "assignment 3 is for correct community",
    assignment3.community_id,
    community.id,
  );

  // Validate moderator IDs match
  TestValidator.equals(
    "assignment 1 has correct moderator",
    assignment1.moderator_id,
    moderator1.id,
  );

  TestValidator.equals(
    "assignment 2 has correct moderator",
    assignment2.moderator_id,
    moderator2.id,
  );

  TestValidator.equals(
    "assignment 3 has correct moderator",
    assignment3.moderator_id,
    moderator3.id,
  );

  // Validate none of these are primary moderators
  TestValidator.equals(
    "assignment 1 is not primary moderator",
    assignment1.is_primary,
    false,
  );

  TestValidator.equals(
    "assignment 2 is not primary moderator",
    assignment2.is_primary,
    false,
  );

  TestValidator.equals(
    "assignment 3 is not primary moderator",
    assignment3.is_primary,
    false,
  );
}
