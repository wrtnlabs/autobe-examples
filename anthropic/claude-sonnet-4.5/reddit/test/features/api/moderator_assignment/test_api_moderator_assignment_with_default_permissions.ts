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
 * Test assigning a new moderator to a community using the default permission
 * set.
 *
 * This test validates that when no custom permissions are specified during
 * moderator assignment, the system grants the default permissions defined in
 * requirements: manage_posts, manage_comments, and access_reports. This ensures
 * newly invited moderators receive a standard baseline permission set for basic
 * moderation capabilities.
 *
 * Test workflow:
 *
 * 1. Create member account for community creation
 * 2. Member creates a community (becomes primary moderator automatically)
 * 3. Create moderator account to be assigned
 * 4. Assign moderator to community without specifying custom permissions
 * 5. Validate the assignment includes correct default permissions
 */
export async function test_api_moderator_assignment_with_default_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 3: Create moderator account to be assigned
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Assign moderator to community without specifying custom permissions
  // Member who created the community is now primary moderator with manage_moderators permission
  const assignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);

  // Step 5: Validate the assignment includes default permissions
  TestValidator.equals(
    "assignment community matches",
    assignment.community_id,
    community.id,
  );
  TestValidator.equals(
    "assignment moderator matches",
    assignment.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "assignment is not primary",
    assignment.is_primary,
    false,
  );

  // Validate default permissions are granted
  const expectedDefaultPermissions =
    "manage_posts,manage_comments,access_reports";
  TestValidator.predicate(
    "default permissions are granted",
    assignment.permissions === expectedDefaultPermissions ||
      (assignment.permissions.includes("manage_posts") &&
        assignment.permissions.includes("manage_comments") &&
        assignment.permissions.includes("access_reports")),
  );
}
