import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_membership_level_update_subscriber_to_member(
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
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: true,
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
        ip: "127.0.0.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create registered user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: userEmail,
        password: "securePassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph(),
        location: RandomGenerator.paragraph({ sentences: 1 }),
        website_url: "https://example.com",
        avatar_url: "https://example.com/avatar.jpg",
        ip: "127.0.0.1",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 3: Create a community for membership management testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Test Community for Membership Testing",
          description:
            "A test community for validating membership level progression workflows",
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

  // Step 4: Add user as subscriber to community for initial membership testing
  const initialMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.create(connection, {
      communityName: community.name,
      userId: user.id,
      body: {
        membership_level: "subscriber",
        post_permissions: false,
        comment_permissions: false,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.ICreate,
    });
  typia.assert(initialMembership);

  TestValidator.equals(
    "initial membership level",
    initialMembership.membership_level,
    "subscriber",
  );
  TestValidator.equals(
    "subscriber has no post permissions",
    initialMembership.post_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber has no comment permissions",
    initialMembership.comment_permissions,
    false,
  );
  TestValidator.equals(
    "subscriber has vote permissions",
    initialMembership.vote_permissions,
    true,
  );

  // Step 5: Update membership level from subscriber to member using community moderator account
  const updatedMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.members.update(connection, {
      communityName: community.name,
      userId: user.id,
      body: {
        membership_level: "member",
        post_permissions: true,
        comment_permissions: true,
        vote_permissions: true,
      } satisfies IRedditPlatformCommunityMembership.IUpdate,
    });
  typia.assert(updatedMembership);

  // Step 6: Validate membership elevation results and permission changes
  TestValidator.equals(
    "membership level updated to member",
    updatedMembership.membership_level,
    "member",
  );
  TestValidator.equals(
    "member has post permissions",
    updatedMembership.post_permissions,
    true,
  );
  TestValidator.equals(
    "member has comment permissions",
    updatedMembership.comment_permissions,
    true,
  );
  TestValidator.equals(
    "member has vote permissions",
    updatedMembership.vote_permissions,
    true,
  );

  TestValidator.equals(
    "community ID preserved",
    updatedMembership.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user ID preserved",
    updatedMembership.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "member field populated",
    updatedMembership.member.username,
    user.username,
  );

  // Step 7: Verify the updated membership contains correct community information
  TestValidator.equals(
    "community name matches",
    updatedMembership.community.name,
    community.name,
  );
  TestValidator.equals(
    "community type preserved",
    updatedMembership.community.type,
    community.type,
  );
  TestValidator.equals(
    "community status preserved",
    updatedMembership.community.status,
    community.status,
  );
}
