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
 * Test retrieving detailed information about a specific moderator assignment.
 *
 * This test validates the complete moderator assignment retrieval workflow:
 *
 * 1. Create a moderator account to assign to a community
 * 2. Create a member account for community creation
 * 3. Member creates a new community
 * 4. Assign the moderator to the community with specific permissions
 * 5. Retrieve the moderator assignment details by ID
 * 6. Validate all assignment metadata including permissions, timestamps, primary
 *    status
 */
export async function test_api_moderator_assignment_details_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account that will be assigned to the community
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

  // Step 3: Member creates a community
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

  // Step 4: Assign moderator to the community with specific permissions
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

  // Step 5: Retrieve the moderator assignment details
  const retrievedAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.at(
      connection,
      {
        communityId: community.id,
        moderatorId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);

  // Step 6: Validate the assignment details match what was created
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
    "permissions match",
    retrievedAssignment.permissions,
    assignmentData.permissions,
  );
  TestValidator.equals(
    "is_primary flag is false",
    retrievedAssignment.is_primary,
    false,
  );
  TestValidator.predicate(
    "assigned_at timestamp exists",
    retrievedAssignment.assigned_at !== null &&
      retrievedAssignment.assigned_at !== undefined,
  );
}
