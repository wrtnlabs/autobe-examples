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
 * Test the complete workflow where a primary moderator updates permissions for
 * another moderator they assigned.
 *
 * This test validates the moderator permission update functionality by
 * simulating a realistic workflow where a primary moderator manages permissions
 * for additional moderators in their community.
 *
 * Workflow:
 *
 * 1. Create a member account (will be assigned as additional moderator)
 * 2. Create a moderator account (will become primary moderator)
 * 3. Moderator creates a community (becomes primary moderator automatically)
 * 4. Primary moderator assigns the member as additional moderator with initial
 *    permissions
 * 5. Primary moderator updates the moderator's permissions to a different set
 * 6. Validate the permission update succeeded and reflects the new permissions
 */
export async function test_api_moderator_permission_update_by_primary_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a member account that will be assigned as additional moderator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a moderator account that will become primary moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a community (becomes primary moderator automatically)
  const communityCode = RandomGenerator.alphaNumeric(15);
  const communityName = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Primary moderator assigns the member as additional moderator with initial permissions
  const initialPermissions = "manage_posts,manage_comments,access_reports";

  const moderatorAssignment =
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

  // Validate initial assignment
  TestValidator.equals(
    "moderator assigned to community",
    moderatorAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "assigned moderator ID matches member",
    moderatorAssignment.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "initial permissions set correctly",
    moderatorAssignment.permissions,
    initialPermissions,
  );
  TestValidator.equals(
    "is not primary moderator",
    moderatorAssignment.is_primary,
    false,
  );

  // Step 5: Primary moderator updates the moderator's permissions to a different set
  const updatedPermissions =
    "manage_posts,manage_comments,manage_settings,access_reports";

  const updatedAssignment =
    await api.functional.redditLike.moderator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
        body: {
          permissions: updatedPermissions,
        } satisfies IRedditLikeCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedAssignment);

  // Step 6: Validate the permission update succeeded
  TestValidator.equals(
    "updated moderator assignment ID matches",
    updatedAssignment.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "updated community ID remains same",
    updatedAssignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "updated moderator ID remains same",
    updatedAssignment.moderator_id,
    member.id,
  );
  TestValidator.equals(
    "permissions updated correctly",
    updatedAssignment.permissions,
    updatedPermissions,
  );
  TestValidator.equals(
    "still not primary moderator",
    updatedAssignment.is_primary,
    false,
  );
  TestValidator.predicate(
    "permissions now include manage_settings",
    updatedAssignment.permissions.includes("manage_settings"),
  );
}
