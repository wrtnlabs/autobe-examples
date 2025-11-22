import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_rule_creation_boundary_title_length(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for the moderator
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserPassword = "SecurePass123!";

  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(15),
        email: registeredUserEmail,
        password: registeredUserPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 2: Create a community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        registered_user_id: registeredUser.id,
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
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Log in as the moderator to get proper authentication
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      username: registeredUser.username,
      password: registeredUserPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformCommunityModerator.ILogin,
  });

  // Step 4: Create a community using the registered user account
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();

  const community =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 5: Test rule creation with exactly 100 characters (should succeed)
  const maxLengthTitle = "A".repeat(100);
  const validRule =
    await api.functional.redditPlatform.communityModerator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          reddit_platform_community_id: community.id,
          title: maxLengthTitle,
          description:
            "This rule tests the maximum allowed title length boundary.",
          rule_type: "content",
          priority: 1,
          is_active: true,
        } satisfies IRedditPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(validRule);
  TestValidator.equals(
    "valid rule creation at 100 chars",
    validRule.title,
    maxLengthTitle,
  );

  // Step 6: Test rule creation with 101 characters (should fail)
  const overLimitTitle = "A".repeat(101);
  await TestValidator.error(
    "should reject rule title over 100 characters",
    async () => {
      await api.functional.redditPlatform.communityModerator.communities.rules.create(
        connection,
        {
          communityName: community.name,
          body: {
            reddit_platform_community_id: community.id,
            title: overLimitTitle,
            description: "This rule title exceeds the maximum allowed length.",
            rule_type: "behavior",
            priority: 2,
            is_active: true,
          } satisfies IRedditPlatformCommunityRule.ICreate,
        },
      );
    },
  );
}
