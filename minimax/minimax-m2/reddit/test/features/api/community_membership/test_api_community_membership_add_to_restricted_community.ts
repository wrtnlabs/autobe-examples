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
 * Test adding a user as a member to a restricted community that requires
 * approval for participation.
 *
 * This test validates the complete workflow of adding a member to a restricted
 * community, including proper authentication flows between different user roles
 * and verification that membership permissions are correctly assigned based on
 * community type and user role.
 *
 * The scenario involves:
 *
 * 1. Creating and authenticating a community moderator account
 * 2. Creating and authenticating a regular user account
 * 3. Using the moderator to create a restricted community (view-only, approval
 *    required for participation)
 * 4. Adding the regular user as a member to the restricted community
 * 5. Validating that membership is created with proper status and access controls
 */
export async function test_api_community_membership_add_to_restricted_community(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUserId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: moderatorUserId,
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
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://reddit-platform.test/moderator/register",
        referrer: "https://reddit-platform.test/",
        ip: "192.168.1.1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Login as community moderator
  const moderatorLogin: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username: moderatorEmail,
        password: "moderatorPassword123",
        href: "https://reddit-platform.test/moderator/login",
        referrer: "https://reddit-platform.test/",
        ip: "192.168.1.1",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 3: Create regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "userPassword123",
        display_name: "Test User",
        bio: "Test user for community membership testing",
        href: "https://reddit-platform.test/user/register",
        referrer: "https://reddit-platform.test/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 4: Login as regular user
  const userLogin: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: "userPassword123",
        href: "https://reddit-platform.test/user/login",
        referrer: "https://reddit-platform.test/",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(userLogin);

  // Step 5: Switch back to moderator to create restricted community
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: moderatorEmail,
      password: "moderatorPassword123",
      href: "https://reddit-platform.test/moderator/login",
      referrer: "https://reddit-platform.test/",
      ip: "192.168.1.1",
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 6: Create restricted community
  const communityName = `restricted_${RandomGenerator.alphaNumeric(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Restricted Test Community",
          description:
            "A restricted community for testing membership workflows",
          type: "restricted", // This is key - requires approval for participation
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community type is restricted",
    community.type,
    "restricted",
  );
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 7: Add user as member to restricted community
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.create(
      connection,
      {
        communityName: communityName,
        userId: user.id,
        body: {
          membership_level: "member", // Full member status
          post_permissions: true, // Can create posts
          comment_permissions: true, // Can comment
          vote_permissions: true, // Can vote
        } satisfies IRedditPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // Step 8: Validate membership details
  TestValidator.equals(
    "membership level is member",
    membership.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions granted",
    membership.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions granted",
    membership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions granted",
    membership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "community matches",
    membership.community.name,
    communityName,
  );
  TestValidator.equals("member user ID matches", membership.member.id, user.id);

  // Verify join timestamp is recent
  const joinTime = new Date(membership.joined_at);
  const now = new Date();
  const timeDiff = now.getTime() - joinTime.getTime();
  TestValidator.predicate("join timestamp is recent", timeDiff < 5000); // Within 5 seconds

  // Validate community details in membership
  TestValidator.equals(
    "community type is restricted",
    membership.community.type,
    "restricted",
  );
  TestValidator.predicate(
    "community is active",
    membership.community.status === "active",
  );
}
