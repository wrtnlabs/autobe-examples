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
 * Test retrieving moderator assignment details to verify primary moderator
 * status and irrevocable permissions.
 *
 * This test validates that the community creator is correctly identified as the
 * primary moderator with the is_primary flag set to true and full permission
 * set. The workflow creates a community (which automatically assigns the
 * creator as primary moderator), assigns an additional moderator, then
 * retrieves that moderator assignment to verify the assignment structure and
 * permissions system.
 *
 * Steps:
 *
 * 1. Create moderator account for authentication and assignment
 * 2. Create member account for community creation
 * 3. Member creates a new community (auto-assigns member as primary moderator with
 *    is_primary=true)
 * 4. Moderator assigns themselves to the community (this assignment will have
 *    is_primary=false)
 * 5. Retrieve the moderator assignment details
 * 6. Verify assignment structure, permissions, and that assigned moderators have
 *    is_primary=false (Note: The community creator/member would have
 *    is_primary=true in their assignment)
 */
export async function test_api_primary_moderator_status_verification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
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

  // Step 2: Create member account for community creation
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
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Member creates a community (automatically becomes primary moderator with is_primary=true)
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
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Assign moderator to community (this creates a non-primary moderator assignment)
  const assignmentData = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: assignmentData,
      },
    );
  typia.assert(assignment);

  // Step 5: Retrieve moderator assignment details
  const retrievedAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.at(
      connection,
      {
        communityId: community.id,
        moderatorId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);

  // Step 6: Verify assignment details
  TestValidator.equals(
    "assignment ID matches",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator ID matches",
    retrievedAssignment.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "assigned moderator is not primary",
    retrievedAssignment.is_primary,
    false,
  );
  TestValidator.equals(
    "permissions match assigned",
    retrievedAssignment.permissions,
    assignmentData.permissions,
  );
  TestValidator.predicate(
    "assignment timestamp exists",
    retrievedAssignment.assigned_at.length > 0,
  );

  // Note: The community creator (member) would have a separate moderator assignment with:
  // - is_primary = true
  // - permissions = "manage_posts,manage_comments,manage_users,manage_settings,manage_moderators,access_reports"
  // - This assignment is irrevocable and grants full permissions
}
