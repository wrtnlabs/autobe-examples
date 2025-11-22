import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test adding a user with 'moderator' membership level in a Reddit-like
 * community platform. This test validates the complete workflow of elevating a
 * regular user to moderator status within a community, ensuring that proper
 * permissions and access rights are granted. The scenario involves: 1) Creating
 * a senior community moderator with authority to appoint moderators, 2)
 * Creating a regular user account to be elevated, 3) Creating a community where
 * the moderation appointment will be tested, 4) Using the senior moderator to
 * add the regular user as a community moderator with full management
 * capabilities, 5) Validating that the membership was created with correct
 * elevated permissions including content management, user oversight, rule
 * enforcement, and administrative privileges. The test ensures that the
 * moderation permissions structure is properly implemented and that users gain
 * appropriate community management rights when appointed as moderators.
 */
export async function test_api_community_membership_add_moderator_level(
  connection: api.IConnection,
) {
  // Step 1: Create senior community moderator with authority to appoint moderators
  const seniorModeratorEmail = typia.random<string & tags.Format<"email">>();
  const seniorModeratorUserId = typia.random<string & tags.Format<"uuid">>();

  const seniorModeratorCreated =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: seniorModeratorUserId,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/register",
        referrer: "https://google.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  typia.assert(seniorModeratorCreated);

  // Step 2: Create regular user account to be elevated to moderator
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: regularUserEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(),
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://example.com/register",
        referrer: "https://google.com",
      },
    },
  );
  typia.assert(regularUser);

  // Step 3: Create community where moderator role assignment will be tested
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        },
      },
    );
  typia.assert(community);

  // Step 4: Use senior moderator to add regular user as community moderator
  const membershipResult =
    await api.functional.redditPlatform.communityModerator.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: regularUser.id,
        body: {
          membership_level: "moderator",
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: true,
        },
      },
    );
  typia.assert(membershipResult);

  // Step 5: Validate that membership was created with correct elevated permissions
  TestValidator.equals(
    "membership level should be moderator",
    membershipResult.membership_level,
    "moderator",
  );
  TestValidator.equals(
    "community ID should match",
    membershipResult.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user ID should match",
    membershipResult.registered_user_id,
    regularUser.id,
  );
  TestValidator.equals(
    "post permissions should be granted",
    membershipResult.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions should be granted",
    membershipResult.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions should be granted",
    membershipResult.vote_permissions,
    true,
  );
  TestValidator.equals(
    "community name should match",
    membershipResult.community.name,
    community.name,
  );
  TestValidator.equals(
    "member username should match",
    membershipResult.member.username,
    regularUser.username,
  );
  TestValidator.predicate(
    "joined at timestamp should exist",
    membershipResult.joined_at !== null &&
      membershipResult.joined_at !== undefined,
  );
}
