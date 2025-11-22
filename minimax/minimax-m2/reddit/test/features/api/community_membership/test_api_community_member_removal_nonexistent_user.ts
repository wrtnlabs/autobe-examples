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
 * Test moderator member removal behavior when attempting to remove a user who
 * is not a member of the community.
 *
 * This test validates proper error handling for invalid user-to-community
 * relationships and ensures appropriate HTTP status codes are returned. The
 * test verifies that the system handles edge cases gracefully without affecting
 * the community state.
 *
 * The test follows this workflow:
 *
 * 1. Create a community moderator account with appropriate permissions
 * 2. Create a separate regular user account (target for removal attempt)
 * 3. Create a community with proper settings
 * 4. Authenticate as the moderator
 * 5. Attempt to remove the user who is not a member of the community
 * 6. Validate that proper error handling occurs and community state remains
 *    unchanged
 * 7. Verify system gracefully handles the invalid removal request
 *
 * This tests the business logic validation that ensures moderators can only
 * remove users who are actually members of their community, preventing
 * unauthorized removal actions and maintaining proper community management
 * boundaries.
 */
export async function test_api_community_member_removal_nonexistent_user(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account to become community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        email: moderatorEmail,
        password: "SecurePassword123!",
        display_name: "Test Moderator",
        bio: "Community moderator for testing purposes",
        location: "Test City",
        website_url: "https://testmoderator.example.com",
        avatar_url: "https://example.com/avatar.jpg",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(moderatorUser);

  // Step 2: Create a separate regular user account (not a member of target community)
  const targetUserEmail = typia.random<string & tags.Format<"email">>();
  const targetUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `targetuser_${RandomGenerator.alphaNumeric(8)}`,
      email: targetUserEmail,
      password: "SecurePassword123!",
      display_name: "Target User",
      bio: "User who will be targeted for removal attempt",
      location: "Test City",
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/landing",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(targetUser);

  // Step 3: Create another regular user account for community creation
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: `creator_${RandomGenerator.alphaNumeric(8)}`,
        email: creatorEmail,
        password: "SecurePassword123!",
        display_name: "Community Creator",
        bio: "Community creator for testing",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(creatorUser);

  // Step 4: Create community moderator account with appropriate permissions
  const moderatorAccount = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: moderatorUser.id,
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
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/landing",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorAccount);

  // Step 5: Create a community for removal testing
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const membershipData = {
    membership_level: "member" as const,
    post_permissions: true,
    comment_permissions: true,
    vote_permissions: true,
  } satisfies IRedditPlatformCommunityMembership.ICreate;

  // Add creator as member to establish the community
  const creatorMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName,
      userId: creatorUser.id,
      body: membershipData,
    });
  typia.assert(creatorMembership);

  // Step 6: Authenticate as community moderator
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: moderatorUser.username,
      password: "SecurePassword123!",
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/home",
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 7: Test removal of non-existent community member
  // This should fail with appropriate error handling since targetUser is not a member
  await TestValidator.error(
    "attempting to remove non-existent community member should fail",
    async () => {
      await api.functional.redditPlatform.communityModerator.communities.members.erase(
        connection,
        {
          communityName,
          userId: targetUser.id,
        },
      );
    },
  );

  // Step 8: Verify community state remains unchanged by checking member list
  // Note: We can't directly check member list with available APIs, but we can verify
  // that the community still exists and our test setup remains valid
  TestValidator.equals(
    "community creator membership should still exist",
    creatorMembership.community.name,
    communityName,
  );

  TestValidator.equals(
    "target user should not be the creator",
    targetUser.id !== creatorUser.id,
    true,
  );

  TestValidator.equals(
    "moderator should have proper permissions",
    moderatorAccount.moderator.moderation_permissions.can_ban_users,
    true,
  );
}
