import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_membership_update_permission_flags(
  connection: api.IConnection,
) {
  // Create community moderator account
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
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
        ip: "127.0.0.1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Create regular user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: userEmail,
        password: "testpassword123",
        display_name: RandomGenerator.name(),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Create community for permission testing
  const communityName: string = `testcommunity_${RandomGenerator.alphabets(8)}`;
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community for ${communityName}`,
          description: "Community created for testing permission flag updates",
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

  // Create initial membership with default permissions
  const initialMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: community.name,
      userId: user.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(initialMembership);

  TestValidator.equals(
    "initial membership has all permissions enabled",
    initialMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "initial membership has comment permissions enabled",
    initialMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "initial membership has vote permissions enabled",
    initialMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "initial membership level is member",
    initialMembership.membership_level,
    "member",
  );

  // Update only post permissions while maintaining membership level
  const updatedMembership1: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          post_permissions: false,
          comment_permissions: undefined,
          vote_permissions: undefined,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership1);

  TestValidator.equals(
    "post permissions are disabled after update",
    updatedMembership1.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions remain enabled",
    updatedMembership1.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions remain enabled",
    updatedMembership1.vote_permissions,
    true,
  );
  TestValidator.equals(
    "membership level remains member",
    updatedMembership1.membership_level,
    "member",
  );

  // Update comment permissions while keeping membership level and post permissions unchanged
  const updatedMembership2: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          post_permissions: undefined,
          comment_permissions: false,
          vote_permissions: undefined,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership2);

  TestValidator.equals(
    "post permissions remain disabled",
    updatedMembership2.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions are now disabled",
    updatedMembership2.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions remain enabled",
    updatedMembership2.vote_permissions,
    true,
  );
  TestValidator.equals(
    "membership level still remains member",
    updatedMembership2.membership_level,
    "member",
  );

  // Update multiple permission flags in one operation
  const updatedMembership3: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          post_permissions: true,
          comment_permissions: true,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership3);

  TestValidator.equals(
    "post permissions are re-enabled",
    updatedMembership3.post_permissions,
    true,
  );
  TestValidator.equals(
    "comment permissions are re-enabled",
    updatedMembership3.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permissions are now disabled",
    updatedMembership3.vote_permissions,
    false,
  );
  TestValidator.equals(
    "membership level still remains member",
    updatedMembership3.membership_level,
    "member",
  );

  // Update membership level while also modifying permissions
  const updatedMembership4: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communityModerator.communities.members.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          membership_level: "subscriber",
          post_permissions: false,
          comment_permissions: false,
          vote_permissions: false,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updatedMembership4);

  TestValidator.equals(
    "membership level changed to subscriber",
    updatedMembership4.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "post permissions are disabled",
    updatedMembership4.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permissions are disabled",
    updatedMembership4.comment_permissions,
    false,
  );
  TestValidator.equals(
    "vote permissions are disabled",
    updatedMembership4.vote_permissions,
    false,
  );
}
