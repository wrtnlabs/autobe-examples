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
 * Test the complete workflow of assigning a new moderator to a community by an
 * existing moderator.
 *
 * This test validates that moderators with 'manage_moderators' permission can
 * successfully invite additional moderators to their communities with
 * customized permission sets. The test ensures proper moderator hierarchy,
 * permission assignment, and relationship tracking.
 *
 * Workflow:
 *
 * 1. Create primary moderator account
 * 2. Create community as primary moderator (becomes primary moderator
 *    automatically)
 * 3. Create member account to be invited as moderator
 * 4. Primary moderator invites member as additional moderator with specific
 *    permissions
 * 5. Validate moderator assignment with correct permissions and metadata
 */
export async function test_api_community_moderator_assignment_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account who will create community and invite additional moderators
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

  // Step 2: Primary moderator creates a community (automatically becomes primary moderator)
  // Note: The moderator authentication is already set in connection.headers from the join call
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
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create member account to be invited as moderator
  // Save the primary moderator's token before creating member
  const primaryModeratorToken = primaryModerator.token.access;

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

  // Step 4: Switch back to primary moderator authentication to invite the member as moderator
  connection.headers = connection.headers || {};
  connection.headers.Authorization = primaryModeratorToken;

  // Step 5: Primary moderator invites member as additional moderator with specific permissions
  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.communities.moderators.create(connection, {
      communityId: community.id,
      body: {
        moderator_id: member.id,
        permissions: "manage_posts,manage_comments,access_reports",
      } satisfies IRedditLikeCommunityModerator.ICreate,
    });
  typia.assert(moderatorAssignment);

  // Step 6: Validate the moderator assignment
  TestValidator.equals(
    "assigned community ID matches",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "assigned moderator ID matches member ID",
    moderatorAssignment.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "moderator is not primary",
    moderatorAssignment.is_primary,
    false,
  );
  TestValidator.equals(
    "permissions are correctly assigned",
    moderatorAssignment.permissions,
    "manage_posts,manage_comments,access_reports",
  );
  TestValidator.predicate(
    "assignment has valid ID",
    moderatorAssignment.id.length > 0,
  );
  TestValidator.predicate(
    "assignment timestamp is valid",
    new Date(moderatorAssignment.assigned_at).getTime() > 0,
  );
}
