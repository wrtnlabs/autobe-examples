import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_membership_add_with_custom_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
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
        assigned_communities: JSON.stringify([]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create regular user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: userEmail,
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 3: Authenticate as moderator
  const moderatorLogin: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username: moderatorEmail,
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 4: Create community
  const communityName: string = RandomGenerator.name(1);
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
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
  typia.assert(community);

  // Step 5: Authenticate as regular user
  const userLogin: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(userLogin);

  // Step 6: Add user to community with custom permissions
  const customPermissions: IRedditPlatformCommunityMembership.ICreate = {
    membership_level: "member",
    post_permissions: true,
    comment_permissions: true,
    vote_permissions: false,
  };

  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.create(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: customPermissions,
      },
    );
  typia.assert(membership);

  // Step 7: Validate membership creation and permissions
  TestValidator.equals(
    "membership level is correct",
    membership.membership_level,
    "member",
  );

  TestValidator.equals(
    "post permissions are enabled",
    membership.post_permissions,
    true,
  );

  TestValidator.equals(
    "comment permissions are enabled",
    membership.comment_permissions,
    true,
  );

  TestValidator.equals(
    "vote permissions are disabled",
    membership.vote_permissions,
    false,
  );

  TestValidator.equals(
    "community matches created community",
    membership.community.id,
    community.id,
  );

  TestValidator.equals(
    "member matches created user",
    membership.member.id,
    user.id,
  );

  TestValidator.equals(
    "community name matches",
    membership.community.name,
    community.name,
  );

  TestValidator.equals(
    "user username matches",
    membership.member.username,
    user.username,
  );

  TestValidator.predicate(
    "joined_at timestamp is set",
    membership.joined_at !== null && membership.joined_at !== undefined,
  );

  TestValidator.predicate(
    "last_activity_at is set",
    membership.last_activity_at !== null &&
      membership.last_activity_at !== undefined,
  );
}
