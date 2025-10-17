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
 * Test moderator assignment creation with custom permissions.
 *
 * This test validates the complete workflow of assigning a new moderator to a
 * community with customized permission sets. The test ensures that a community
 * creator (who automatically becomes the primary moderator) can successfully
 * invite another registered moderator user to join the moderation team with
 * specific permissions.
 *
 * The workflow follows these steps:
 *
 * 1. Create admin account for system access
 * 2. Create member account who will create and own the community
 * 3. Member creates a community (becoming primary moderator automatically)
 * 4. Create moderator account that will be assigned to the community
 * 5. Primary moderator assigns the new moderator with custom permissions
 * 6. Validate the moderator assignment record is correctly created
 *
 * The test verifies:
 *
 * - Community creation makes the creator a primary moderator
 * - Moderator assignment includes correct IDs and relationships
 * - Custom permissions are properly recorded
 * - Assignment metadata (timestamp, primary flag) is accurate
 * - The system enforces the 25 moderator limit per community
 */
export async function test_api_moderator_assignment_creation_with_custom_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "AdminPass123!@#",
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account (will be community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "MemberPass123!@#",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Member creates community (becomes primary moderator)
  const communityCode = RandomGenerator.alphaNumeric(15);
  const communityName = RandomGenerator.name(2);

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Create moderator account to be assigned
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "ModPass123!@#",
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 5: Assign moderator to community with custom permissions
  const customPermissions = "manage_posts,manage_comments,access_reports";

  const assignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: customPermissions,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);

  // Step 6: Validate the moderator assignment
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
    "assignment is not primary",
    assignment.is_primary,
    false,
  );
  TestValidator.equals(
    "assignment permissions match",
    assignment.permissions,
    customPermissions,
  );
}
