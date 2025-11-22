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
 * Test updating membership permissions in a restricted community that requires
 * approval for participation.
 *
 * This test validates that community moderators can properly update user
 * membership levels and participation rights within restricted communities,
 * ensuring that permission changes respect community access controls and
 * approval requirements.
 *
 * The test follows a complete workflow: creating moderator and user accounts,
 * establishing a restricted community, initializing membership, and validating
 * permission updates by the authorized moderator. This ensures the community
 * management system properly handles access control and permission delegation
 * in restricted community contexts.
 */
export async function test_api_community_membership_update_restricted_community_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "SecurePassword123!";

  const moderatorJoinData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
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
    assigned_communities: "[]",
    appointed_by: "system_admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    href: "https://reddit-platform.example.com/moderator/registration",
    referrer: "https://reddit-platform.example.com/",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(moderator);

  // Step 2: Create registered user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "UserPassword456!";

  const userJoinData = {
    username: RandomGenerator.alphaNumeric(12),
    email: userEmail,
    password: userPassword,
    href: "https://reddit-platform.example.com/user/registration",
    referrer: "https://reddit-platform.example.com/",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 3: Switch back to moderator to create restricted community
  const moderatorLoginData = {
    username: moderator.moderator.user?.username ?? "moderator",
    password: moderatorPassword,
    href: "https://reddit-platform.example.com/moderator/login",
    referrer: "https://reddit-platform.example.com/",
  } satisfies IRedditPlatformCommunityModerator.ILogin;

  const moderatorAuth: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginData,
    });
  typia.assert(moderatorAuth);

  // Step 4: Create restricted community requiring approval
  const communityName: string = `restricted_test_${RandomGenerator.alphaNumeric(8)}`;

  const communityData = {
    name: communityName,
    title: "Restricted Test Community",
    description:
      "A test community for validating membership permission updates in restricted access environments.",
    type: "restricted" as const,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
    require_post_approval: false,
    require_comment_approval: false,
    nsfw_content_allowed: false,
  } satisfies IRedditPlatformCommunity.ICreate;

  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Add user as initial member to the community (as moderator)
  const initialMembershipData = {
    membership_level: "subscriber" as const,
    post_permissions: false,
    comment_permissions: false,
    vote_permissions: true,
  } satisfies IRedditPlatformCommunityMembership.ICreate;

  const initialMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: community.name,
      userId: user.id,
      body: initialMembershipData,
    });
  typia.assert(initialMembership);

  // Step 6: Validate initial membership state
  TestValidator.equals(
    "initial membership level should be subscriber",
    initialMembership.membership_level,
    "subscriber",
  );
  TestValidator.predicate(
    "initial user should not have post permissions",
    !initialMembership.post_permissions,
  );
  TestValidator.predicate(
    "initial user should not have comment permissions",
    !initialMembership.comment_permissions,
  );
  TestValidator.predicate(
    "initial user should have vote permissions",
    initialMembership.vote_permissions,
  );

  // Step 7: Update user membership permissions as moderator (main test)
  const updatedMembershipData = {
    membership_level: "member" as const,
    post_permissions: true,
    comment_permissions: true,
    vote_permissions: true,
  } satisfies IRedditPlatformCommunityMembership.IUpdate;

  const updatedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: updatedMembershipData,
      },
    );
  typia.assert(updatedMembership);

  // Step 8: Validate updated membership permissions
  TestValidator.equals(
    "membership level should be updated to member",
    updatedMembership.membership_level,
    "member",
  );
  TestValidator.predicate(
    "user should now have post permissions",
    updatedMembership.post_permissions,
  );
  TestValidator.predicate(
    "user should now have comment permissions",
    updatedMembership.comment_permissions,
  );
  TestValidator.predicate(
    "user should retain vote permissions",
    updatedMembership.vote_permissions,
  );

  // Step 9: Verify community context is preserved in updated membership
  TestValidator.equals(
    "community name should match",
    updatedMembership.community.name,
    community.name,
  );
  TestValidator.equals(
    "community type should be restricted",
    updatedMembership.community.type,
    "restricted",
  );

  // Step 10: Verify user context is preserved in updated membership
  TestValidator.equals(
    "user ID should match original user",
    updatedMembership.member.id,
    user.id,
  );
  TestValidator.equals(
    "user username should match",
    updatedMembership.member.username,
    user.username,
  );

  // Step 11: Test additional permission update (upgrade to moderator level)
  const moderatorLevelUpdate = {
    membership_level: "moderator" as const,
    post_permissions: true,
    comment_permissions: true,
    vote_permissions: true,
  } satisfies IRedditPlatformCommunityMembership.IUpdate;

  const finalMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: moderatorLevelUpdate,
      },
    );
  typia.assert(finalMembership);

  // Step 12: Validate moderator-level permissions
  TestValidator.equals(
    "membership level should be updated to moderator",
    finalMembership.membership_level,
    "moderator",
  );
  TestValidator.predicate(
    "moderator should have post permissions",
    finalMembership.post_permissions,
  );
  TestValidator.predicate(
    "moderator should have comment permissions",
    finalMembership.comment_permissions,
  );
  TestValidator.predicate(
    "moderator should have vote permissions",
    finalMembership.vote_permissions,
  );

  // Step 13: Test permission restriction (downgrade to subscriber with limited permissions)
  const restrictedUpdate = {
    membership_level: "subscriber" as const,
    post_permissions: false,
    comment_permissions: true, // Allow commenting but not posting
    vote_permissions: true,
  } satisfies IRedditPlatformCommunityMembership.IUpdate;

  const restrictedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: restrictedUpdate,
      },
    );
  typia.assert(restrictedMembership);

  // Step 14: Validate restricted permissions
  TestValidator.equals(
    "membership level should be subscriber",
    restrictedMembership.membership_level,
    "subscriber",
  );
  TestValidator.predicate(
    "restricted user should not have post permissions",
    !restrictedMembership.post_permissions,
  );
  TestValidator.predicate(
    "restricted user should have comment permissions",
    restrictedMembership.comment_permissions,
  );
  TestValidator.predicate(
    "restricted user should have vote permissions",
    restrictedMembership.vote_permissions,
  );
}
