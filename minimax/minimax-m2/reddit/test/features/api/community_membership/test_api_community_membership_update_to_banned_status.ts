import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_membership_update_to_banned_status(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community management
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorCreated: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_ban_users: true,
          can_remove_posts: true,
          can_remove_comments: true,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: false,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: "127.0.0.1",
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com/login",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorCreated);
  TestValidator.equals(
    "moderator account created",
    moderatorCreated.moderator.active_status,
    "active",
  );

  // Step 2: Create regular user account to be banned
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userCreated: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        bio: "Regular community member for testing",
        location: "Test City",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        ip: "127.0.0.1",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userCreated);
  TestValidator.equals(
    "user account created",
    userCreated.accountStatus,
    "active",
  );

  // Step 3: Create community for ban testing
  const communityName = `test_community_${RandomGenerator.alphabets(6)}`;
  const communityCreated: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: "Test Community for Ban Testing",
          description:
            "A test community specifically created for validating member ban functionality",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreated);
  TestValidator.equals(
    "community created successfully",
    communityCreated.name,
    communityName,
  );

  // Step 4: Switch to moderator authentication for community operations
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: moderatorCreated.moderator.user?.username || "moderator",
      password: "TestPassword123!",
      href: "https://test.example.com/moderator",
      referrer: "https://test.example.com/admin",
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 5: Add regular user as community member
  const membershipCreated: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: communityCreated.name,
      userId: userCreated.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(membershipCreated);
  TestValidator.equals(
    "membership created with full permissions",
    membershipCreated.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permissions enabled",
    membershipCreated.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions enabled",
    membershipCreated.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions enabled",
    membershipCreated.vote_permissions,
    true,
  );

  // Step 6: Update membership to banned status (ban the member)
  const membershipUpdated: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: communityCreated.name,
        userId: userCreated.id,
        body: {
          membership_level: "banned",
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(membershipUpdated);

  // Step 7: Validate ban functionality - membership level and permissions
  TestValidator.equals(
    "membership level updated to banned",
    membershipUpdated.membership_level,
    "banned",
  );
  TestValidator.equals(
    "post permissions disabled after ban",
    membershipUpdated.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions disabled after ban",
    membershipUpdated.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions disabled after ban",
    membershipUpdated.vote_permissions,
    false,
  );

  // Step 8: Verify member and community data integrity
  TestValidator.equals(
    "community name preserved in membership",
    membershipUpdated.community.name,
    communityCreated.name,
  );
  TestValidator.equals(
    "user ID preserved in membership",
    membershipUpdated.member.id,
    userCreated.id,
  );

  // Step 9: Validate ban is effective by checking no access remains
  TestValidator.predicate(
    "user has no post permissions after ban",
    !membershipUpdated.post_permissions,
  );
  TestValidator.predicate(
    "user has no comment permissions after ban",
    !membershipUpdated.comment_permissions,
  );
  TestValidator.predicate(
    "user has no vote permissions after ban",
    !membershipUpdated.vote_permissions,
  );
  TestValidator.predicate(
    "user is completely banned from community",
    membershipUpdated.membership_level === "banned",
  );
}
