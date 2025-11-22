import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_membership_permission_override(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const moderatorRegisteredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(moderatorRegisteredUser);

  // Create community moderator with specific permissions
  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: moderatorRegisteredUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: "system",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 2: Create a registered user account for permission testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);

  const regularUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(regularUser);

  // Step 3: Create a community for permission override testing
  const communityName: string = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: `Test Community ${communityName}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 4: Add the user as a member to the community with initial permissions
  const initialMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: community.name,
      userId: regularUser.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(initialMembership);

  // Verify initial permissions
  TestValidator.equals(
    "initial post permission",
    initialMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "initial comment permission",
    initialMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "initial vote permission",
    initialMembership.vote_permissions,
    true,
  );
  TestValidator.equals(
    "initial membership level",
    initialMembership.membership_level,
    "member",
  );

  // Step 5: Login as the community moderator
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: moderatorRegisteredUser.username,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 6: Update specific permission flags while maintaining membership level
  const updatedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.update(connection, {
      communityName: community.name,
      userId: regularUser.id,
      body: {
        // Keep membership level the same
        membership_level: "member",
        // Update specific permissions - disable posting, keep commenting and voting
        post_permissions: false,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(updatedMembership);

  // Step 7: Verify the permission changes are applied correctly
  TestValidator.equals(
    "membership level unchanged",
    updatedMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "post permission revoked",
    updatedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "comment permission maintained",
    updatedMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "vote permission maintained",
    updatedMembership.vote_permissions,
    true,
  );

  // Step 8: Test another permission update - disable voting while keeping other permissions
  const finalMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.update(connection, {
      communityName: community.name,
      userId: regularUser.id,
      body: {
        membership_level: "member",
        post_permissions: false,
        comment_permissions: true,
        vote_permissions: false,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(finalMembership);

  // Verify the final permission state
  TestValidator.equals(
    "final post permission",
    finalMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "final comment permission",
    finalMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "final vote permission",
    finalMembership.vote_permissions,
    false,
  );
  TestValidator.equals(
    "final membership level",
    finalMembership.membership_level,
    "member",
  );

  // Step 9: Test membership level change with permission override
  const promotedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.update(connection, {
      communityName: community.name,
      userId: regularUser.id,
      body: {
        membership_level: "moderator",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(promotedMembership);

  TestValidator.equals(
    "promoted membership level",
    promotedMembership.membership_level,
    "moderator",
  );
  TestValidator.equals(
    "restored post permission",
    promotedMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "maintained comment permission",
    promotedMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "restored vote permission",
    promotedMembership.vote_permissions,
    true,
  );

  // Step 10: Test demotion back to member with restricted permissions
  const demotedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.update(connection, {
      communityName: community.name,
      userId: regularUser.id,
      body: {
        membership_level: "member",
        post_permissions: false,
        comment_permissions: false,
        vote_permissions: false,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(demotedMembership);

  TestValidator.equals(
    "demoted membership level",
    demotedMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "revoked post permission",
    demotedMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "revoked comment permission",
    demotedMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "revoked vote permission",
    demotedMembership.vote_permissions,
    false,
  );
}
